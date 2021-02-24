/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {managed} from '@xh/hoist/core';
import {makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {throwIf} from '@xh/hoist/utils/js';
import {HoistBase} from '../HoistBase';
import {LoadSpec} from './LoadSpec';

/**
 * Provides support for objects that participate in Hoist's loading/refresh lifecycle.
 *
 * This utility is used by core Hoist classes such as {@see HoistModel} and {@see HoistService},
 * which will automatically create an instance of this class if they have declared a concrete
 * implementation of `doLoadAsync()`, signalling that they wish to take advantage of the additional
 * tracking and management provided here.
 *
 * Not typically created directly by applications.
 */
export class LoadSupport extends HoistBase {

    _lastRequested = null;
    _lastSucceeded = null;

    /**
     * @member {PendingTaskModel} - model tracking the loading of this object.
     *      Note that this model will *not* track auto-refreshes.
     */
    @managed
    loadModel = new PendingTaskModel();

    /** @member {Date} - date when last load was initiated (observable) */
    @observable.ref lastLoadRequested = null;

    /** @member {Date} - date when last load completed (observable) */
    @observable.ref lastLoadCompleted = null;

    /** @member {Error} - any exception that occurred during last load (observable) */
    @observable.ref lastLoadException = null;

    constructor(target) {
        super();
        throwIf(!target.doLoadAsync, `Target of LoadSupport must implement method doLoadAsync`);
        makeObservable(this);
        this.target = target;
    }

    /**
     * Load the target by calling its `doLoadAsync()` implementation
     *
     * @param {LoadSpec} [loadSpec] - optional metadata about the underlying request. Not created
     *      directly by applications. Within app code, this parameter is typically used within
     *      `doLoadAsync()` implementations when calling `loadAsync()` on *other* objects to
     *      relay the `LoadSpec` that they were given.
     */
    async loadAsync(loadSpec = null) {
        throwIf(
            loadSpec && !loadSpec.isLoadSpec,
            'Unexpected param passed to loadAsync().  If triggered via a reaction, ensure call is wrapped in a closure.'
        );
        loadSpec = loadSpec ?
            new LoadSpec({isRefresh: loadSpec.isRefresh, isAutoRefresh: loadSpec.isAutoRefresh, owner: this}) :
            new LoadSpec({owner: this});

        return this.internalLoadAsync(loadSpec);
    }

    /**
     * Refresh the target.
     */
    async refreshAsync() {
        return this.internalLoadAsync(new LoadSpec({isRefresh: true, owner: this}));
    }

    /**
     * Auto-refresh the target.
     */
    async autoRefreshAsync() {
        return this.internalLoadAsync(new LoadSpec({isAutoRefresh: true, owner: this}));
    }

    //--------------------------
    // Implementation
    //--------------------------
    async internalLoadAsync(loadSpec) {
        let {target, loadModel} = this;

        // Auto-refresh:
        // Skip if we have a pending triggered refresh, and never link to loadModel
        if (loadSpec.isAutoRefresh) {
            if (loadModel.isPending) return;
            loadModel = null;
        }

        runInAction(() => this.lastLoadRequested = new Date());
        this._lastRequested = loadSpec;

        let exception = null;
        return target
            .doLoadAsync(loadSpec)
            .linkTo(loadModel)
            .catch(e => {
                exception = e;
                throw e;
            })
            .finally(() => {
                runInAction(() => {
                    this.lastLoadCompleted = new Date();
                    this.lastLoadException = exception;
                });

                if (!exception) {
                    this._lastSucceeded = loadSpec;
                }

                if (target.isRefreshContextModel) return;

                const elapsed = this.lastLoadCompleted.getTime() - this.lastLoadRequested.getTime(),
                    msg = `[${target.constructor.name}] | ${loadSpec.typeDisplay} | ${exception ? 'failed' : 'completed'} | ${elapsed}ms`;

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

}


/**
 * Load a collection of objects concurrently.
 *
 * Note that this method uses 'allSettled' in its implementation, meaning a failure of any one call
 * will not cause the entire batch to throw.
 *
 * @param {Object[]} objs - list of objects to be loaded
 * @param {LoadSpec} [loadSpec] - metadata related to this request.
*/
export async function loadAllAsync(objs, loadSpec) {
    const promises = objs.map(it => it.loadAsync(loadSpec)),
        ret = await Promise.allSettled(promises);

    ret.filter(it => it.status === 'rejected')
        .forEach(err => console.error('Failed to Load Object', err.reason));

    return ret;
}
