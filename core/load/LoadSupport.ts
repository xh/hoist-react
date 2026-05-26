/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    CallContext,
    HoistBase,
    LoadSpecConfig,
    managed,
    PlainObject,
    RefreshContextModel,
    TaskObserver,
    XH
} from '../';
import {LoadSpec, Loadable} from './';
import {makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {logDebug, logError} from '@xh/hoist/utils/js';
import {isNil, omitBy} from 'lodash';

/**
 * Provides support for objects that participate in Hoist's loading/refresh lifecycle.
 *
 * This utility is used by core Hoist classes such as {@link HoistModel} and {@link HoistService}.
 * Model and service instances will automatically create an instance of this class if they have
 * declared a concrete implementation of `doLoadAsync()`, signaling that they wish to take
 * advantage of the additional tracking and management provided here.
 *
 * Not typically created directly by applications.
 */
export class LoadSupport extends HoistBase implements Loadable {
    /**
     * LoadSpec for the last load initiated.
     * @internal
     */
    lastRequested: LoadSpec = null;

    /**
     * LoadSpec for the last load to complete successfully.
     * @internal
     */
    lastSucceeded: LoadSpec = null;

    @managed
    loadObserver: TaskObserver = TaskObserver.trackLast();

    @observable.ref
    lastLoadRequested: Date = null;

    @observable.ref
    lastLoadCompleted: Date = null;

    @observable.ref
    lastLoadException: any = null;

    /** @internal */
    target: Loadable;

    constructor(target: Loadable) {
        super();
        makeObservable(this);
        this.target = target;
    }

    /**
     * Trigger a managed load through the target's {@link doLoadAsync} template method. Use this
     * (or {@link refreshAsync}/{@link autoRefreshAsync}) - do not call `doLoadAsync` directly,
     * so that Hoist creates a fresh {@link LoadSpec} and tracks the request.
     *
     * Accepts an optional config to set `isRefresh`/`isAutoRefresh` flags or app-specific `meta`.
     *
     * See the lifecycle doc (`docs/lifecycle-models-and-services.md#loading-doloadasync`) for the
     * full load/refresh lifecycle.
     */
    async loadAsync(loadSpec: LoadSpecConfig | CallContext) {
        // Favor any concrete loadSpec from a call context (passed along RunContext is a common case)
        const config: LoadSpecConfig = loadSpec?.['loadSpec'] ?? loadSpec,
            newSpec = new LoadSpec(config ?? {}, this);

        return this.doLoadAsync(newSpec);
    }

    async refreshAsync(meta?: PlainObject) {
        return this.loadAsync({meta, isRefresh: true});
    }

    async autoRefreshAsync(meta?: PlainObject) {
        return this.loadAsync({meta, isAutoRefresh: true});
    }

    /**
     * Run the managed-load lifecycle for the target: short-circuits redundant
     * auto-refreshes, links the load to the `loadObserver`, delegates to
     * `target.doLoadAsync(loadSpec)`, and updates `lastLoadCompleted` /
     * `lastLoadException` on completion.
     *
     * Application code should not override or call this directly - it is the
     * orchestrator that the public entry points (`loadAsync`/`refreshAsync`/
     * `autoRefreshAsync`) ultimately invoke. Application templates that opt
     * into managed loading override `doLoadAsync` on their own model/service
     * class instead (see {@link Loadable.doLoadAsync}).
     */
    async doLoadAsync(loadSpec: LoadSpec) {
        let {target, loadObserver} = this;

        // Auto-refresh:
        // Skip if we have a pending triggered refresh and never link to loadObserver
        if (loadSpec.isAutoRefresh) {
            if (loadObserver.isPending) return;
            loadObserver = null;
        }

        const requested = new Date();
        runInAction(() => (this.lastLoadRequested = requested));
        this.lastRequested = loadSpec;

        let exception = null;

        // Silence aborted/superseded loads and (opt-in) auto-refresh errors.
        const skip = (e: any) =>
            e?.isAborted ||
            loadSpec.shouldAbort ||
            (target.skipAutoRefreshErrors && loadSpec.isAutoRefresh);

        let skipped = false;
        return target
            .doLoadAsync(loadSpec)
            .linkTo(loadObserver)
            .catch(async e => {
                if (skip(e)) {
                    // Log non-timing errors on the server.
                    skipped = true;
                    if (!e.isAborted) XH.handleException(e);
                } else {
                    await target.handleLoadException?.(e, loadSpec);
                    exception = e;
                }
            })
            .finally(() => {
                // For non-skipped, update state in transaction
                if (!skipped) {
                    runInAction(() => {
                        this.lastLoadException = exception;
                        this.lastLoadCompleted = new Date();
                        if (!exception) {
                            this.lastSucceeded = loadSpec;
                        }
                    });
                }

                // Debug log skipping uninteresting trampolining RefreshContextModels
                if (target instanceof RefreshContextModel) return;

                const elapsed = Date.now() - requested.getTime(),
                    status = exception ? 'failed' : null,
                    msg = omitBy(
                        {type: loadSpec.typeDisplay, status, elapsed, skipped, exception},
                        isNil
                    );
                logDebug(msg, target);
            });
    }

    handleLoadException(e: unknown, loadSpec: LoadSpec): void {
        XH.handleException(e);
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
