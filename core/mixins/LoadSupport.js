/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {applyMixin, throwIf} from '@xh/hoist/utils/js';
import {isPlainObject} from 'lodash';
import {decorate, observable, runInAction} from 'mobx';

/**
 * Mixin to indicate that an object has a load and refresh lifecycle for loading data from backend
 * sources and setting up resources.
 *
 * This decorator is designed to be applied to implementations of HoistModel and HoistService.
 * It is also implemented by standard classes such as UrlStore, RestStore, RestGridModel.
 *
 * @see HoistModel
 * @see UrlStore
 * @see RestStore
 * @see RestGridModel
 */
export function LoadSupport(C) {

    decorate(C,  {
        lastLoadRequested: observable.ref,
        lastLoadCompleted: observable.ref,
        lastLoadException: observable.ref
    });

    return applyMixin(C, {
        name: 'LoadSupport',

        defaults: {

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
        },


        provides: {

            /**
             * Load this object from underlying data sources or services.
             * NOT for implementation.  Implement doLoadAsync() instead.
             *
             * @param {LoadSpec} [loadSpec] - Metadata about the underlying request
             */
            async loadAsync(loadSpec = {}) {
                throwIf(
                    !isPlainObject(loadSpec),
                    'Unexpected param passed to loadAsync() - accepts loadSpec object only. If triggered via a reaction, ensure call is wrapped in a closure.'
                );

                // Skip auto-refresh if we have a pending triggered refresh
                if (loadSpec.isAutoRefresh && this.loadModel.isPending) return;

                runInAction(() => this.lastLoadRequested = new Date());
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
                            this.lastLoadCompleted = new Date();
                            this.lastLoadException = exception;
                        });

                        if (C.isRefreshContextModel) return;

                        const elapsed = this.lastLoadCompleted.getTime() - this.lastLoadRequested.getTime(),
                            msg = `[${C.name}] | ${getLoadTypeFromSpec(loadSpec)} | ${exception ? 'failed' : 'completed'} | ${elapsed}ms`;

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
            },

            /**
             * Refresh this object from underlying data sources or services.
             * NOT for implementation.  Implement doLoadAsync() instead.
             */
            async refreshAsync() {
                return this.loadAsync({isRefresh: true, isAutoRefresh: false});
            },

            /**
             * Auto-refresh this object from underlying data sources or services.
             * NOT for implementation.  Implement doLoadAsync() instead.
             */
            async autoRefreshAsync() {
                return this.loadAsync({isRefresh: true, isAutoRefresh: true});
            },


            /**
             * PendingTaskModel tracking the loading of this object
             *
             * Note that this model will *not* track auto-refreshes.
             */
            loadModel: {
                get() {
                    if (!this._loadModel) this._loadModel = new PendingTaskModel();
                    return this._loadModel;
                }
            }
        },

        chains: {
            destroy() {
                XH.safeDestroy(this._loadModel);
            }
        }
    });
}

function getLoadTypeFromSpec(loadSpec) {
    if (loadSpec.isAutoRefresh) return 'Auto-Refresh';
    if (loadSpec.isRefresh) return 'Refresh';
    return 'Load';
}

/**
 * Load a collection of objects with LoadSupport concurrently.
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
