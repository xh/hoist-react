/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {observable, extendObservable, runInAction} from '@xh/hoist/mobx';
import {isPlainObject} from 'lodash';
import {PendingTaskModel} from '@xh/hoist/utils/async';

import {HoistBase} from './HoistBase';
import {managed} from './HoistBaseDecorators';

/**
 * Provides support for objects that participate in Hoist's loading/refresh lifecycle.
 *
 * This class should not typically be extended directly by applications.  Applications should
 * extend one of its subclasses instead.
 *
 * @see HoistModel, HoistService, and Store.
 */
export class Loadable extends HoistBase {

    get isLoadable() {return true}

    /**
     * Does this object implement loading?
     * True if an implementation of doLoadAsync been provided.
     */
    get implementsLoading() {
        return this.doLoadAsync !== Loadable.prototype.doLoadAsync;
    }

    /**
     * @member {PendingTaskModel} - model tracking the loading of this object
     * Note that this model will *not* track auto-refreshes.
     */
    @managed
    get loadModel() {return this._loadModel}

    /** @member {Date} - date when last load was initiated (observable) */
    get lastLoadRequested() {return this._lastLoadRequested}

    /** @member {Date} -  date when last load completed (observable) */
    get lastLoadCompleted() {return this._lastLoadCompleted}

    /** @member {Error} Any exception that occurred during last load (observable) */
    get lastLoadException() {return this._lastLoadException}

    constructor() {
        super();

        if (this.implementsLoading) {
            this._loadModel = new PendingTaskModel();
            this._lastLoadRequested = null;
            this._lastLoadCompleted = null;
            this._lastLoadException = null;

            extendObservable(this, {
                _lastLoadRequested: observable.ref,
                _lastLoadCompleted: observable.ref,
                _lastLoadException: observable.ref
            });
        }
    }


    /**
     * Load this object from underlying data sources or services.
     * Main public entry point.
     *
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
     *      take care to pass this parameter to any delegates (e.g. other instances of Loadable)
     *      that accept it.
     */
    async doLoadAsync(loadSpec) {}

}
Loadable.isLoadable = true;


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