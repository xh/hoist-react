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
import {extendObservable, observable, runInAction} from 'mobx';

/**
 * Mixin to provide load and refresh lifecycle for loading data from backend
 * sources and setting up resources.
 *
 * This mixin is used by standard classes such as HoistModel, HoistService, UrlStore,
 * RestStore, RestGridModel to support a data loading lifecycle.
 *
 * To implement loading, concrete classes need to provide a doLoadAsync() Method.
 *
 * @see HoistModel
 * @see UrlStore
 * @see RestStore
 * @see RestGridModel
 */
export function LoadSupport(C) {

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
            doLoadAsync: null
        },


        provides: {

            /**
             * Initialize loading for his object.
             */
            initLoadSupport() {
                if (!this.implementsLoading) return;

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
            },

            /**
             * Does this object implement loading?
             * True if an implementation of doLoadAsync been provided?
             */
            implementsLoading: {
                get() {
                    return !!this.doLoadAsync;
                }
            },

            /**
             * Load this object from underlying data sources or services.
             * NOT for implementation.  Implement doLoadAsync() instead.
             *
             * @param {LoadSpec} [loadSpec] - Metadata about the underlying request
             */
            async loadAsync(loadSpec = {}) {
                throwIf(!this.loadModel, 'Loading not initialized. Be sure to implement doLoadAsync() and call initLoadSupport().');
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

                        if (C.isRefreshContextModel) return;

                        const elapsed = this._lastLoadCompleted.getTime() - this._lastLoadRequested.getTime(),
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
                get() {return this._loadModel}
            },

            /**
             * Date when last load was initiated.
             */
            lastLoadRequested: {
                get() {return this._lastLoadRequested}
            },

            /**
             * Date when last load completed.
             */
            lastLoadCompleted: {
                get() {return this._lastLoadCompleted}
            },

            /**
             * Any exception that occurred during last load.
             */
            lastLoadException: {
                get() {return this._lastLoadException}
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
