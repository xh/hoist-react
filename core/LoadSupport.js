/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {observable, makeObservable, runInAction} from '@xh/hoist/mobx';
import {isPlainObject} from 'lodash';
import {PendingTaskModel} from '@xh/hoist/utils/async';

import {HoistBase} from './HoistBase';
import {managed} from './HoistBaseDecorators';

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

    /**
     * @member {PendingTaskModel} - model tracking the loading of this object.
     *      Note that this model will *not* track auto-refreshes.
     */
    @managed
    loadModel = new PendingTaskModel();

    /** @member {Date} - date when last load was initiated (observable) */
    @observable.ref lastLoadRequested = null;

    /** @member {Date} -  date when last load completed (observable) */
    @observable.ref lastLoadCompleted = null;

    /** @member {Error} Any exception that occurred during last load (observable) */
    @observable.ref lastLoadException = null;

    constructor(target) {
        super();
        throwIf(!target.doLoadAsync, `Target of LoadSupport must implement method doLoadAsync`);
        makeObservable(this);
        this.target = target;
    }

    /**
     * Load the target by calling its `doLoadAsync()` implementation.
     *
     * @param {LoadSpec} [loadSpec] - optional metadata about the underlying request, used within
     *      Hoist and application code to adjust related behaviors such as error handling and
     *      activity tracking.
     */
    async loadAsync(loadSpec = {}) {
        const {target} = this;
        throwIf(
            !isPlainObject(loadSpec),
            'Unexpected param passed to loadAsync() - accepts loadSpec object only. If triggered via a reaction, ensure call is wrapped in a closure.'
        );

        // Skip auto-refresh if we have a pending triggered refresh
        if (loadSpec.isAutoRefresh && this.loadModel.isPending) return;

        runInAction(() => this.lastLoadRequested = new Date());
        const loadModel = !loadSpec.isAutoRefresh ? this.loadModel : null;

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

                if (this.target.isRefreshContextModel) return;

                const elapsed = this.lastLoadCompleted.getTime() - this.lastLoadRequested.getTime(),
                    msg = `[${target.constructor.name}] | ${getLoadTypeFromSpec(loadSpec)} | ${exception ? 'failed' : 'completed'} | ${elapsed}ms`;

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
     * Refresh the target.
     */
    async refreshAsync() {
        return this.loadAsync({isRefresh: true, isAutoRefresh: false});
    }

    /**
     * Auto-refresh the target.
     */
    async autoRefreshAsync() {
        return this.loadAsync({isRefresh: true, isAutoRefresh: true});
    }
}


/**
* Load a collection of objects concurrently.
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


//------------------------
// Implementation
//------------------------
function getLoadTypeFromSpec(loadSpec) {
    if (loadSpec.isAutoRefresh) return 'Auto-Refresh';
    if (loadSpec.isRefresh) return 'Refresh';
    return 'Load';
}
