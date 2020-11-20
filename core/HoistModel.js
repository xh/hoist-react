/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {ManagedSupport, ReactiveSupport, XhIdSupport, PersistSupport, managed} from '@xh/hoist/core';
import {makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {throwIf, isClass} from '@xh/hoist/utils/js';
import {isFunction, isPlainObject, isString} from 'lodash';


/**
 * Core class for State Models in Hoist.
 *
 * Adds support for managed events and mobx reactivity.
 *
 * A common use of HoistModel is to serve as a backing store for a HoistComponent.  Furthermore, if
 * a model is *created* by a HoistComponent it is considered to be 'owned' (or "hosted") by that
 * component.  An owned model will be automatically destroyed when its component is unmounted.
 *
 * For HoistModels that need to load/refresh data consider setting the loadSupport flag.
 * This flag will cause data to be loaded into the model when its component is first mounted,
 * and will register the model with the nearest RefreshContextModel for subsequent refreshes.
 *
 */
@ManagedSupport
@ReactiveSupport
@PersistSupport
@XhIdSupport
export class HoistModel {

    get isHoistModel() {return true}
    get isLoadSupport() {return false}

    /**
     * PendingTaskModel tracking the loading of this object
     *
     * Note that this model will *not* track auto-refreshes.
     */
    @managed
    loadModel = null;

    // TODO: conditionally declare these in constructor only when needed
    @observable.ref lastLoadRequested = null;
    @observable.ref lastLoadCompleted = null;
    @observable.ref lastLoadException = null;


    constructor() {
        console.log(this);
        makeObservable(this);
        if (this.isLoadSupport) {
            this.loadModel = new PendingTaskModel();
        }
    }

    matchesSelector(selector) {
        if (isFunction(selector)) return isClass(selector) ? this instanceof selector : selector(this);
        if (isString(selector)) return !!this['is' + selector];
        return false;
    }

    //-----------------------
    // Load Support related
    //-----------------------
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

                if (this.isRefreshContextModel) return;

                const elapsed = this.lastLoadCompleted.getTime() - this.lastLoadRequested.getTime(),
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
}
HoistModel.isHoistModel = true;

function getLoadTypeFromSpec(loadSpec) {
    if (loadSpec.isAutoRefresh) return 'Auto-Refresh';
    if (loadSpec.isRefresh) return 'Refresh';
    return 'Load';
}


/**
 * Load a collection of HoistModels with LoadSupport concurrently.
 *
 * @param {Object[]} objs - list of objects to be loaded
 * @param {LoadSpec} loadSpec - metadata related to this request.
 *
 * Note that this method uses 'allSettled' in its implementation in order to
 * to avoid a failure of any single call from causing the method to throw.
 */
export async function loadAllAsync(objs, loadSpec) {
    console.log(objs);
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
