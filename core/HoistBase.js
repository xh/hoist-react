/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH, Reactive, PersistenceProvider} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {observable, extendObservable, runInAction} from '@xh/hoist/mobx';
import {cloneDeep, isPlainObject, isUndefined} from 'lodash';
import {PendingTaskModel} from '@xh/hoist/utils/async';

/**
 * Base class for Services, Models, Stores, and other core entities in Hoist.
 *
 * Provides misc support for resource cleanup, state persistence.  Also provides optional
 * support for lifecycle loading and other useful utilities.
 *
 * This class should not typically be extended directly by applications.  Applications should
 * extend one of its subclasses instead.
 *
 * @see HoistModel, HoistService, and Store.
 */
export class HoistBase extends Reactive {

    constructor() {
        super();
        if (this.implementsLoading) {
            this._loadModel = new PendingTaskModel();
            extendObservable(this,
                {
                    _lastLoadRequested: null,
                    _lastLoadCompleted: null,
                    _lastLoadException: null
                },
                {
                    _lastLoadRequested: observable.ref,
                    _lastLoadCompleted: observable.ref,
                    _lastLoadException: observable.ref
                });
        }
    }

    /**
     * A unique id for this object within the lifetime of this document.
     * @returns {string}
     */
    get xhId() {
        if (!this._xhId) this._xhId = XH.genId();
        return this._xhId;
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
        this._xhManagedInstances = this._xhManagedInstances ?? [];
        this._xhManagedInstances.push(obj);
        return obj;
    }

    //-----------------------
    // Load Support
    //-----------------------
    /**
     * Does this object implement loading?
     * True if an implementation of doLoadAsync been provided.
     */
    get implementsLoading() {
        return this.doLoadAsync !== HoistBase.prototype.doLoadAsync;
    }

    /**
     * @member {PendingTaskModel} - model tracking the loading of this object
     * Note that this model will *not* track auto-refreshes.
     */
    get loadModel() {return this._loadModel}

    /** @member {Date} - date when last load was initiated.*/
    get lastLoadRequested() {return this._lastLoadRequested}

    /** @member {Date} -  date when last load completed */
    get lastLoadCompleted() {return this._lastLoadCompleted}

    /** @member {Error} Any exception that occurred during last load.*/
    get lastLoadException() {return this._lastLoadException}

    /**
     * Load this object from underlying data sources or services.
     * NOT for implementation.  Implement doLoadAsync() instead.
     *
     * @param {LoadSpec} [loadSpec] - Metadata about the underlying request
     */
    async loadAsync(loadSpec = {}) {
        if (!this.implementsLoading) {
            console.warn('Loading not initialized. Be sure to implement doLoadAsync().');
            return;
        }

        throwIf(
            !isPlainObject(loadSpec),
            'Unexpected param passed to loadAsync() - accepts loadSpec object only. If triggered via a reaction, ensure call is wrapped in a closure.'
        );

        // Skip auto-refresh if we have a pending triggered refresh
        if (loadSpec.isAutoRefresh && this.loadModel.isPending) return;

        runInAction(() => this._lastLoadRequested = new Date());
        const loadModel = !loadSpec.isAutoRefresh ? this.loadModel : null;

        let exception = null;
        return this
            .doLoadAsync(loadSpec)
            .linkTo(loadModel)
            .catch(e => {
                exception = e;
                throw e;
            })
            .finally(() => {
                runInAction(() => {
                    this._lastLoadCompleted = new Date();
                    this._lastLoadException = exception;
                });

                if (this.isRefreshContextModel) return;

                const elapsed = this._lastLoadCompleted.getTime() - this._lastLoadRequested.getTime(),
                    msg = `[${this.constructor.name}] | ${getLoadTypeFromSpec(loadSpec)} | ${exception ? 'failed' : 'completed'} | ${elapsed}ms`;

                if (exception) {
                    if (exception.isRoutine) {
                        console.debug(msg, exception);
                    } else {
                        console.error(msg, exception);
                    }
                } else {
                    console.debug(msg);
                }
            });
    }


    /**
     * Refresh this object from underlying data sources or services.
     * NOT for implementation.  Implement doLoadAsync() instead.
     */
    async refreshAsync() {
        return this.loadAsync({isRefresh: true, isAutoRefresh: false});
    }

    /**
     * Auto-refresh this object from underlying data sources or services.
     * NOT for implementation.  Implement doLoadAsync() instead.
     */
    async autoRefreshAsync() {
        return this.loadAsync({isRefresh: true, isAutoRefresh: true});
    }

    /**
     * Load this object. Implement this method to describe how this object should load
     * itself from underlying data sources or services.
     *
     * For implementation only.  Callers should call loadAsync() or refreshAsync() instead.
     *
     * @param {LoadSpec} loadSpec - Metadata about the underlying request. Implementations should
     *      take care to pass this parameter to any delegates (e.g. other LoadSupport instances)
     *      that accept it.
     */
    async doLoadAsync(loadSpec) {}


    //-------------------
    // Other
    //-------------------

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
        this._xhManagedProperties?.forEach(p => XH.safeDestroy(this[p]));
        this._xhManagedInstances?.forEach(i => XH.safeDestroy(i));
        XH.safeDestroy(this._loadModel);
        super.destroy();
    }
}


/**
 * Load a collection of HoistBase objects concurrently.
 *
 * @param {Object[]} objs - list of objects to be loaded
 * @param {LoadSpec} loadSpec - metadata related to this request.
 *
 * Note that this method uses 'allSettled' in its implementation in order to
 * to avoid a failure of any single call from causing the method to throw.
 */
export async function loadAllAsync(objs, loadSpec) {
    const promises = objs.map(it => it.loadAsync(loadSpec)),
        ret = await Promise.allSettled(promises);

    ret.filter(it => it.status === 'rejected')
        .forEach(err => console.error('Failed to Load Object', err.reason));

    return ret;
}


/**
 * @typedef {Object} LoadSpec
 *
 * @property {boolean} [isRefresh] - true if this load was triggered by a refresh request.
 * @property {boolean} [isAutoRefresh] - true if this load was triggered by a programmatic
 *       refresh process, rather than a user action.
 */


//--------------------------------------------------
// Implementation
//--------------------------------------------------
function getLoadTypeFromSpec(loadSpec) {
    if (loadSpec.isAutoRefresh) return 'Auto-Refresh';
    if (loadSpec.isRefresh) return 'Refresh';
    return 'Load';
}