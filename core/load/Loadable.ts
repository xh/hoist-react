/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {CallContext, TaskObserver} from '../';
import {LoadSpec, LoadSpecConfig} from './';

/**
 * Controls how {@link FetchService} aborts a fetch whose load has been superseded.
 *
 * - `never`: never auto-abort - the fetch always resolves, even if a newer load has started.
 * - `onStale`: abort once a newer load request has been *started*. Default.
 * - `onObsolete`: abort once a newer load has *successfully completed*. More conservative -
 *   the in-flight load still applies its data unless a newer load actually wins.
 */
export type AbortMode = 'never' | 'onStale' | 'onObsolete';

/**
 * Interface for the primary load/refresh APIs on models and services with {@link LoadSupport}.
 */
export interface Loadable {
    /**
     * For tracking the loading of this object.
     * Note that this object will *not* track auto-refreshes.
     */
    loadObserver: TaskObserver;

    /** Date when last load was initiated. */
    lastLoadRequested: Date;

    /** Date when last load was completed. */
    lastLoadCompleted: Date;

    /** Any exception that occurred during last load. */
    lastLoadException: any;

    /**
     * Controls when {@link FetchService} should abort a fetch carrying this object's
     * `LoadSpec` because the load has been superseded. Defaults to `'onStale'` - aborted
     * fetches throw {@link LoadAbortedException}, which the central exception handler
     * silently drops.
     */
    abortMode?: AbortMode;

    /**
     * Trigger a managed load through this object's {@link doLoadAsync} template method. Use this
     * (or {@link refreshAsync}/{@link autoRefreshAsync}) - do not call `doLoadAsync` directly,
     * so that Hoist creates a fresh {@link LoadSpec} and tracks the request via {@link LoadSupport}.
     *
     * Accepts an optional config to set `isRefresh`/`isAutoRefresh` flags or app-specific `meta`.
     *
     * See the lifecycle doc (`docs/lifecycle-models-and-services.md#loading-doloadasync`) for the
     * full load/refresh lifecycle.
     */
    loadAsync(loadSpec?: LoadSpecConfig | CallContext): Promise<void>;

    /**
     * Trigger a managed refresh - equivalent to `loadAsync({isRefresh: true, meta})`. The optional
     * `meta` argument is passed directly here (not wrapped in a config object) and is exposed as
     * `loadSpec.meta` in `doLoadAsync()`.
     */
    refreshAsync(meta?: object): Promise<void>;

    /**
     * Trigger a background auto-refresh - equivalent to `loadAsync({isAutoRefresh: true, meta})`.
     * Skipped if a load is already pending. The optional `meta` argument is passed directly here
     * (not wrapped in a config object) and is exposed as `loadSpec.meta` in `doLoadAsync()`.
     */
    autoRefreshAsync(meta?: object): Promise<void>;

    /**
     * Template method for subclasses that want managed loading.
     *
     * Override this method to opt into Hoist's managed loading (auto-installs {@link LoadSupport}).
     * Called by the framework via {@link loadAsync}/{@link refreshAsync}/{@link autoRefreshAsync} -
     * do not call directly. The supplied {@link LoadSpec} carries `isRefresh`, `isAutoRefresh`,
     * `isStale`, and any app-specific `meta` for branching behavior. Implementations should pass
     * `loadSpec` to nested `loadAsync()` calls and to {@link FetchService} requests.
     *
     * See the lifecycle doc (`docs/lifecycle-models-and-services.md#loading-doloadasync`) for the
     * full load/refresh lifecycle.
     */
    doLoadAsync(loadSpec: LoadSpec): Promise<void>;

    /**
     * Called by {@link LoadSupport} when {@link doLoadAsync} throws. Override to add
     * app-specific cleanup (e.g. clearing a grid, resetting state) without re-implementing
     * the standard error-handling path.
     *
     * The framework filters out *quiet* exceptions before invoking this method - aborted
     * loads/fetches (`isAborted`) and any error raised during an auto-refresh
     * (`loadSpec.isAutoRefresh`) - so overrides can assume any exception they see is a
     * genuine, surface-worthy failure.
     *
     * Default implementation calls `XH.handleException(e)`.
     */
    handleLoadException?(e: unknown, loadSpec: LoadSpec): void | Promise<void>;
}
