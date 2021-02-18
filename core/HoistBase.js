/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, PersistenceProvider} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {
    debounce as lodashDebounce,
    cloneDeep,
    isFunction,
    isNil,
    isNumber,
    isPlainObject,
    isUndefined,
    upperFirst
} from 'lodash';
import {
    action,
    runInAction,
    autorun as mobxAutorun,
    reaction as mobxReaction,
    when as mobxWhen
} from '@xh/hoist/mobx';
import {getOrCreate} from '../utils/js';

/**
 * Base class for objects in Hoist.
 * Provides misc. support for Mobx integration, state persistence, and resource cleanup.
 *
 * This class should not typically be extended directly by applications. Applications should
 * extend one of its subclasses instead, notably:
 * @see HoistModel
 * @see HoistService
 * @see Store
 */
export class HoistBase {

    _xhManagedInstances = [];
    _xhDisposers = [];

    get isHoistBase() {return true}

    /**
     * Add and start a managed reaction.
     *
     * A reaction's run function will be executed on changes to any/all observables read in its
     * track function, regardless of whether they - or any other observables - are accessed in
     * the run function. The reaction will also run only when the output of the track function
     * changes, and this output is passed to the run function.
     *
     * Specify the property 'track' to run the reaction continuously until disposal.
     * Alternatively, specify the 'when' property to run this reaction only until the predicate
     * passes, and the run function is executed once. (These map to mobX's native `reaction()`
     * and `when()` functions, respectively).
     *
     * Choose this method over an autorun when you wish to explicitly declare which observables
     * should be tracked. A common pattern is to have the track function return these
     * observables in a simple array or object, which the run function can use as its input or
     * (commonly) ignore. This helps to clarify that the track function is only enumerating
     * the observables to be watched, and not necessarily generating or transforming values.
     *
     *  This reaction will be disposed of automatically when this object is destroyed. It can also be
     *  ended/disposed of manually using the native mobx disposer function returned by this method.
     *
     * @param {Object} conf - configuration of reaction, containing options accepted by MobX
     *      reaction() API, as well as arguments below.
     * @param {function} [conf.track] - function returning data to observe - first arg to the
     *      underlying reaction() call. Specify this or `when`.
     * @param {function} [conf.when] - function returning data to observe - first arg to the
     *      underlying when() call. Specify this or `track`.
     * @param {function} conf.run - function to run - second arg to underlying reaction()/when() call.
     * @param {(number|Object)} [conf.debounce] - Specify to debounce run function with lodash.
     *      When specified as object, should contain an 'interval' and other optional keys for
     *      lodash.  If specified as number the default lodash debounce will be used.
     * @returns {function} - disposer to manually dispose of the created reaction.
     */
    addReaction({track, when, run, debounce, ...opts}) {
        throwIf(
            (track && when) || (!track && !when),
            "Must specify either 'track' or 'when' in addReaction."
        );
        validateMobxOptions(opts);

        run = bindAndDebounce(this, run, debounce);

        const disposer = track ? mobxReaction(track, run, opts) : mobxWhen(when, run, opts);
        this._xhDisposers.push(disposer);
        return disposer;
    }


    /**
     * Add and start an autorun.
     *
     * An autorun function will be run on changes to any/all observables read during the last
     * execution of the function. This provides convenient and often very efficient dynamic
     * reactivity. This is a core MobX concept and is important to fully understand when
     * using autorun functions.
     *
     * In some cases, however, it is desirable or more clear to explicitly declare which
     * observables should be tracked and trigger a reaction, regardless of their use within
     * the function itself. See addReaction() below for that functionality.
     *
     * This autorun will be disposed of automatically when this object is destroyed. It can also be
     * ended/disposed of manually using the native mobx disposer function returned by this method.
     *
     * @param {(Object|function)} conf - function to run, or a config object containing options
     *      accepted by MobX autorun() API as well as argument below.
     * @param {function} [conf.run] - function to run - first arg to underlying autorun() call.
     * @param {(number|Object)} [conf.debounce] - Specify to debounce run function with lodash.
     *      When specified as Object, should contain an 'interval' and other optional keys for
     *      lodash debounce.  If specified as number the default lodash debounce will be used.
     * @returns {function} - disposer to manually dispose of the created autorun.
     */
    addAutorun(conf) {
        if (isFunction(conf)) conf = {run: conf};
        let {run, debounce, ...opts} = conf;

        validateMobxOptions(opts);
        run = bindAndDebounce(this, run, debounce);

        const disposer = mobxAutorun(run, opts);
        this._xhDisposers.push(disposer);
        return disposer;
    }

    /**
     * Set an observable/bindable value.
     *
     * This method is a convenience method for calling the conventional setXXX method
     * for updating a mobx observable given the property name.
     *
     * @param {string} property
     * @param {*} value
     */
    setBindable(property, value) {
        const setter = `set${upperFirst(property)}`;
        throwIf(!isFunction(this[setter]),
            `Required function '${setter}()' not found on bound model. ` +
            `Implement a setter, or use the @bindable annotation.`
        );
        this[setter].call(this, value);
    }

    /**
     * @param {Object} conf - configuration of check to run.
     * @param {function} [conf.when] - function returning data to observe.
     * @param {function} [conf.timeout] - interval value in ms.
     * @param {function} conf.errorMsg - message for Exception thrown on timeout.
     * @returns {promise} - Returns a promise that resolves to true as soon as `when` returns true,
     *                      or resolves to false if `when` does not return true within timeout.
     */
    async whenAsync({when, timeout, errorMsg}) {
        return mobxWhen(when)
            .timeout({
                interval: timeout,
                message: errorMsg
            })
            .then(() => true)
            .catch(error => {
                console.error(error);
                return false;
            });
    }

    /**
     * A unique id for this object within the lifetime of this document.
     * @returns {string}
     */
    get xhId() {
        return getOrCreate(this, '_xhId', XH.genId);
    }

    /**
     * Mark an object as managed by this object.
     *
     * Managed objects are assumed to hold objects that are created by the referencing object
     * and therefore should be destroyed when the referencing object is destroyed.
     *
     * See also {@see managed}, a decorator that can be used to mark any object held within
     * a given property as managed.
     *
     * @param {object} obj - object to be destroyed
     * @returns object passed.
     */
    markManaged(obj) {
        this._xhManagedInstances.push(obj);
        return obj;
    }

    /**
     *  Method to make a class property persistent, syncing its value via a configured
     * `PersistenceProvider` to maintain and restore values across browser sessions.
     *
     * This may be used on any @observable or @bindable class property which is a primitive.
     * It will initialize the observable's value from the class's default
     * `PersistenceProvider` and will subsequently write back any changes to the property
     * to that Provider. If the Provider has not yet been populated with a value, or an
     * error occurs, it will use the value set in-code instead.
     *
     * @param {string} property - name of property on this object to bind to a
     *      persistence provider.
     * @param {PersistOptions} [options] - options governing the persistence of this
     *      object.  These will be applied on top of any default persistWith options defined
     *      on the instance itself.
     *
     * See also @persist and @persist.with for a convenient decorator that may be used
     * directly on the property declaration itself.  Use this method in the general case,
     * when you need to control the timing.
     */
    markPersist(property, options = {}) {
        // Read from and attach to Provider, failing gently
        try {
            const persistWith = {path: property, ...this.persistWith, ...options},
                provider = this.markManaged(PersistenceProvider.create(persistWith)),
                providerState = provider.read();
            if (!isUndefined(providerState)) {
                runInAction(() => this[property] = cloneDeep(providerState));
            }
            this.addReaction({
                track: () => this[property],
                run: (data) => provider.write(data)
            });
        } catch (e) {
            console.error(
                `Failed to configure Persistence for '${property}'.  Be sure to fully specify ` +
                `'persistWith' on this object or in the method call.`
            );
        }
    }

    /**
     * Clean up resources associated with this object
     */
    destroy() {
        this._xhDisposers?.forEach(f => f());
        this._xhManagedInstances.forEach(i => XH.safeDestroy(i));
        this._xhManagedProperties?.forEach(p => XH.safeDestroy(this[p]));
    }
}
HoistBase.isHoistBase = true;

//--------------------------------------------------
// Implementation
// Externalized to make private, obj is the instance
//--------------------------------------------------
function validateMobxOptions(options) {
    throwIf(
        !isNil(options.runImmediately),
        '"runImmediately" is not a reaction option.  Did you mean "fireImmediately"?'
    );
}

function bindAndDebounce(obj, fn, debounce) {
    let ret = fn.bind(obj);

    //  See https://github.com/mobxjs/mobx/issues/1956 and note we cannot use mobx scheduler.
    //  ensure the async run of the effect also occurs in action as expected.
    if (isNumber(debounce)) return lodashDebounce(action(ret), debounce);
    if (isPlainObject(debounce)) return lodashDebounce(action(ret), debounce.interval, debounce);
    return ret;
}
