/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    HoistBase,
    LoadSpecConfig,
    managed,
    PlainObject,
    RefreshContextModel,
    TaskObserver
} from '../';
import {LoadSpec, Loadable} from './';
import {makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {logDebug, logError, throwIf} from '@xh/hoist/utils/js';
import {isPlainObject, pull} from 'lodash';

/**
 * Provides support for objects that participate in Hoist's loading/refresh lifecycle.
 *
 * This utility is used by core Hoist classes such as {@link HoistModel} and {@link HoistService}.
 * Model and service instances will automatically create an instance of this class if they have
 * declared a concrete implementation of `doLoadAsync()`, signalling that they wish to take
 * advantage of the additional tracking and management provided here.
 *
 * Not typically created directly by applications.
 */
export class LoadSupport extends HoistBase implements Loadable {
    lastRequested: LoadSpec = null;
    lastSucceeded: LoadSpec = null;

    @managed
    loadObserver: TaskObserver = TaskObserver.trackLast();

    @observable.ref
    lastLoadRequested: Date = null;

    @observable.ref
    lastLoadCompleted: Date = null;

    @observable.ref
    lastLoadException: any = null;

    target: Loadable;

    constructor(target: Loadable) {
        super();
        makeObservable(this);
        this.target = target;
    }

    async loadAsync(loadSpec?: LoadSpecConfig) {
        throwIf(
            loadSpec && !(loadSpec instanceof LoadSpec || isPlainObject(loadSpec)),
            'Unexpected param passed to loadAsync().  If triggered via a reaction ' +
                'ensure call is wrapped in a closure.'
        );
        const newSpec = new LoadSpec(loadSpec ?? {}, this);

        return this.doLoadAsync(newSpec);
    }

    async refreshAsync(meta?: PlainObject) {
        return this.loadAsync({meta, isRefresh: true});
    }

    async autoRefreshAsync(meta?: PlainObject) {
        return this.loadAsync({meta, isAutoRefresh: true});
    }

    async doLoadAsync(loadSpec: LoadSpec) {
        let {target, loadObserver} = this;

        // Auto-refresh:
        // Skip if we have a pending triggered refresh, and never link to loadObserver
        if (loadSpec.isAutoRefresh) {
            if (loadObserver.isPending) return;
            loadObserver = null;
        }

        runInAction(() => (this.lastLoadRequested = new Date()));
        this.lastRequested = loadSpec;

        let exception = null;

        return target
            .doLoadAsync(loadSpec)
            .linkTo(loadObserver)
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
                    this.lastSucceeded = loadSpec;
                }

                if (target instanceof RefreshContextModel) return;

                const elapsed = this.lastLoadCompleted.getTime() - this.lastLoadRequested.getTime(),
                    status = exception ? 'failed' : null,
                    msg = pull([loadSpec.typeDisplay, status, `${elapsed}ms`, exception], null);

                if (exception) {
                    if (exception.isRoutine) {
                        logDebug(msg, target);
                    } else {
                        logError(msg, target);
                    }
                } else {
                    logDebug(msg, target);
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
 * @param objs - list of objects to be loaded
 * @param loadSpec - optional metadata related to this request.
 */
export async function loadAllAsync(objs: Loadable[], loadSpec?: LoadSpec | any) {
    const promises = objs.map(it => it.loadAsync(loadSpec)),
        ret = await Promise.allSettled(promises);

    ret.filter(it => it.status === 'rejected').forEach((err: any) =>
        logError(['Failed to Load Object', err.reason])
    );

    return ret;
}
