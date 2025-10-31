/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {
    action,
    autorun as mobxAutorun,
    checkMakeObservable,
    comparer,
    reaction as mobxReaction,
    runInAction,
    when as mobxWhen
} from '@xh/hoist/mobx';
import {
    getOrCreate,
    logDebug,
    logError,
    logInfo,
    logWarn,
    throwIf,
    withDebug,
    withInfo
} from '@xh/hoist/utils/js';
import {
    debounce as lodashDebounce,
    isFunction,
    isNil,
    isNumber,
    isPlainObject,
    isString,
    upperFirst
} from 'lodash';
import {IAutorunOptions, IReactionOptions} from 'mobx/dist/api/autorun';
import {IEqualsComparer, IReactionDisposer} from 'mobx/dist/internal';
import {DebounceSpec, PersistableState, PersistenceProvider, PersistOptions, Some, XH} from './';
import {wait} from '@xh/hoist/promise';

declare const xhIsDevelopmentMode: boolean;

export interface HoistBaseClass {
    new (...args: any[]): HoistBase;
    isHoistBase: boolean;
}

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
export abstract class HoistBase {
    static get isHoistBase(): boolean {
        return true;
    }
    get isHoistBase(): boolean {
        return true;
    }

    constructor() {
        if (xhIsDevelopmentMode) {
            wait().then(() => checkMakeObservable(this));
        }
    }

    /**
     * For XH internal use only - marks this instance as created by and for Hoist as part of its
     * own implementation. Used as a filter within Hoist Inspector to distinguish services and
     * models that are either created directly by the app developer or important/public parts of
     * the Hoist API from those that are not.
     * @internal
     */
    xhImpl: boolean = undefined;

    // Internal State
    private managedInstances = [];
    private disposers = [];
    private _destroyed = false;
    private _xhImpl: boolean;

    /** Default persistence options for this object. */
    persistWith: PersistOptions = null;

    //--------------------------------------------------
    // Logging Delegates
    //--------------------------------------------------
    logInfo(...messages: unknown[]) {
        logInfo(messages, this);
    }

    logWarn(...messages: unknown[]) {
        logWarn(messages, this);
    }

    logError(...messages: unknown[]) {
        logError(messages, this);
    }

    logDebug(...messages: unknown[]) {
        logDebug(messages, this);
    }

    withInfo<T>(messages: Some<unknown>, fn: () => T): T {
        return withInfo<T>(messages, fn, this);
    }

    withDebug<T>(messages: Some<unknown>, fn: () => T): T {
        return withDebug<T>(messages, fn, this);
    }

    /**
     * Add and start one or more managed reactions.
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
     * Specify the property 'equals' to determine how successive outputs of track will be compared.
     * Hoist supports string specification of this (i.e. 'shallow','structural', or 'identity') and
     * will map it to the underlying MobX `comparer` object.  For returns of arrays and objects,
     * consider using the value 'shallow' over the default 'identity' to avoid triggering spurious
     * changes. See MobX for more information.
     *
     * Choose this method over an autorun when you wish to explicitly declare which observables
     * should be tracked. A common pattern is to have the track function return these
     * observables in a simple array or object, which the run function can use as its input or
     * (commonly) ignore. This helps to clarify that the track function is only enumerating
     * the observables to be watched, and not necessarily generating or transforming values.
     *
     *  Reactions created in this method will be disposed of automatically when this object is
     *  destroyed. They can also be ended/disposed of manually using the native MobX disposer
     *  functions returned by this method.
     *
     * @param specs - one or more reactions to add
     * @returns disposer(s) to manually dispose of each created reaction.
     */
    addReaction<T>(spec: ReactionSpec<T>): IReactionDisposer;
    addReaction<T extends any[]>(
        ...specs: {[K in keyof T]: ReactionSpec<T[K]>}
    ): IReactionDisposer[];

    addReaction(...specs: ReactionSpec[]): IReactionDisposer | IReactionDisposer[] {
        const disposers = specs.map(s => {
            if (!s) return null;
            let {track, when, run, debounce, ...rest} = s;
            throwIf(
                (track && when) || (!track && !when),
                "Must specify either 'track' or 'when' in addReaction."
            );
            const opts = parseReactionOptions(rest);
            run = bindAndDebounce(this, run, debounce);

            const disposer = track ? mobxReaction(track, run, opts) : mobxWhen(when, run, opts);
            this.disposers.push(disposer);
            return disposer;
        });
        return disposers.length === 1 ? disposers[0] : disposers;
    }

    /**
     * Add and start one or more managed autoruns.
     *
     * An autorun function will be run on changes to any/all observables read during the last
     * execution of the function. This provides convenient and often very efficient dynamic
     * reactivity. This is a core MobX concept and is important to fully understand when
     * using autorun functions.
     *
     * In some cases, however, it is desirable or more clear to explicitly declare which
     * observables should be tracked and trigger a reaction, regardless of their use within
     * the function itself. See addReaction() above for that functionality.
     *
     * Autoruns created in this method will be disposed of automatically when this object is
     * destroyed. They can also be ended/disposed of manually using the native mobx disposer
     * functions returned by this method.
     *
     * @param specs - one or more autoruns to add
     * @returns disposer(s) to manually dispose of each created autorun.
     */
    addAutorun(
        ...specs: Array<AutoRunSpec | (() => any)>
    ): IReactionDisposer | Array<IReactionDisposer> {
        const disposers = specs.map(s => {
            if (!s) return null;
            if (isFunction(s)) s = {run: s};
            let {run, ...opts} = s;

            run = bindAndDebounce(this, run);

            const disposer = mobxAutorun(run, opts);
            this.disposers.push(disposer);
            return disposer;
        });

        return disposers.length === 1 ? disposers[0] : disposers;
    }

    /**
     * Set an observable/bindable value.
     *
     * This method is a convenience method for calling the conventional setXXX method
     * for updating a mobx observable given the property name.
     */
    setBindable(property: string, value: any) {
        const setter = `set${upperFirst(property)}`;
        throwIf(
            !isFunction(this[setter]),
            `Required function '${setter}()' not found on bound model. ` +
                `Implement a setter, or use the @bindable annotation.`
        );
        this[setter].call(this, value);
    }

    /** @returns a unique id for this object within the lifetime of this document. */
    get xhId(): string {
        return getOrCreate(this, '_xhId', XH.genId);
    }

    /**
     * Mark an object as managed by this object.
     *
     * Managed objects are assumed to hold objects that are created by the referencing object
     * and therefore should be destroyed when the referencing object is destroyed.
     *
     * See also {@link managed}, a decorator that can be used to mark any object held within
     * a given property as managed.
     *
     * @param obj - object to be destroyed when this instance is destroyed
     * @returns object passed
     */
    markManaged<T>(obj: T): T {
        // If markManaged is unexpectedly called on an object after this instance has been
        // destroyed - e.g. in an async callback - destroy it immediately.
        if (this.isDestroyed) {
            XH.safeDestroy(obj);
        } else {
            this.managedInstances.push(obj);
        }
        return obj;
    }

    /**
     *  Method to make a class property persistent, syncing its value via a configured
     * `PersistenceProvider` to maintain and restore values across browser sessions.
     *
     * This may be used on any `@observable` or `@bindable` class property which is a primitive.
     * It will initialize the observable's value from the class's default `PersistenceProvider` and
     * will write back any changes to the property to that Provider. If the Provider has not yet
     * been populated with a value, or an error occurs, it will use the value set in-code instead.
     *
     * See also {@link persist} and {@link persist.with} for a decorator that may be used directly
     * on the property declaration itself. Use this method in the general case, when you need to
     * control the timing.
     *
     * @param property - name of property on this object to bind to a persistence provider.
     * @param options - options governing the persistence of this object. These will be applied
     *      on top of any default persistWith options defined on the instance itself.
     */
    markPersist<P extends keyof this & string>(property: P, options: PersistOptions = {}) {
        // Read from and attach to Provider, failing gently
        PersistenceProvider.create({
            persistOptions: {
                path: property,
                ...PersistenceProvider.mergePersistOptions(this.persistWith, options)
            },
            owner: this,
            target: {
                getPersistableState: () => new PersistableState(this[property]),
                setPersistableState: state => runInAction(() => (this[property] = state.value))
            }
        });
    }

    /** @returns true if this instance has been destroyed. */
    get isDestroyed() {
        return this._destroyed;
    }

    /**
     * Clean up resources associated with this object
     */
    destroy() {
        this._destroyed = true;
        this.disposers.forEach(f => f());
        this.managedInstances.forEach(i => XH.safeDestroy(i));
        this['_xhManagedProperties']?.forEach(p => XH.safeDestroy(this[p]));
    }
}

/**
 * Object containing options accepted by MobX 'reaction' API as well as arguments below.
 */
export interface ReactionSpec<T = any> extends Omit<IReactionOptions<T, any>, 'equals'> {
    /**
     * Function returning data to observe - first arg to the underlying reaction() call.
     * Specify this or `when`.
     */
    track?: () => T;

    /**
     * Function determining when reaction should fire - first arg to the underlying when() call.
     * Specify this or `track`.
     */
    when?: () => boolean;

    /** Function to run - second arg to underlying reaction()/when() call. */
    run?: (curr?: T, prev?: T) => void;

    /** Specify to debounce run function */
    debounce?: DebounceSpec;

    /** Specify a default from {@link comparer} or a custom comparer function. */
    equals?: keyof typeof comparer | IEqualsComparer<T>;
}

/**
 * Object containing options accepted by MobX 'autorun' API as well as arguments below.
 */
export interface AutoRunSpec extends IAutorunOptions {
    /** Function to run - first arg to underlying autorun() call. */
    run?: () => void;
}

//--------------------------------------------------
// Implementation
// Externalized to make private, obj is the instance
//--------------------------------------------------
function parseReactionOptions(options) {
    throwIf(
        !isNil(options.runImmediately),
        '"runImmediately" is not a reaction option.  Did you mean "fireImmediately"?'
    );

    if (isString(options.equals)) {
        const equals = comparer[options.equals];
        throwIf(!isFunction(equals), `Unknown value for equals: '${options.equals}'`);
        options = {...options, equals};
    }
    return options;
}

function bindAndDebounce(obj, fn, debounce = null) {
    let ret = fn.bind(obj);

    //  See https://github.com/mobxjs/mobx/issues/1956 and note we cannot use mobx scheduler.
    //  ensure the async run of the effect also occurs in action as expected.
    if (isNumber(debounce)) return lodashDebounce(action(ret), debounce);
    if (isPlainObject(debounce)) return lodashDebounce(action(ret), debounce.interval, debounce);
    return ret;
}
