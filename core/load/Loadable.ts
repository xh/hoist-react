/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {TaskObserver} from '../';
import {LoadSpec} from './';

/**
 * Object that supports Hoist's loading/refresh lifecycle.
 */
export interface Loadable {

    /**
     * For tracking the loading of this object.
     * Note that this model will *not* track auto-refreshes.
     */
    loadModel: TaskObserver;

    /** Date when last load was initiated. */
    lastLoadRequested: Date;

    /** Date when last load was completed. */
    lastLoadCompleted: Date

    /** Any exception that occurred during last load. */
    lastLoadException: any;

    /**
     * Load the target.
     *
     * This method is the main public entry point for this interface and is responsible for
     * calling the objects `doLoadAsync()` implementation.  See also `refreshAsync()` and
     * `autoRefreshAsync()` for convenience variants of this method.
     *
     * @param [loadSpec] - LoadSpec, or a simple Object containing properties to create one.
     *
     *      Note that implementations of `doLoadAsync()` that delegate to loadAsync() calls of
     *      other objects should typically pass along the LoadSpec object they receive -- or an
     *      enriched version of it -- to their delegates.
     */

    loadAsync(loadSpec?: LoadSpec|any);

    /**
     * Refresh the target.
     * @param [meta] - optional metadata for the request.
     */
    refreshAsync(meta?: object)

    /**
     * Auto-refresh the target.
     * @param [meta] - optional metadata for the request.
     */
    autoRefreshAsync(meta?: object)

    /**
     * Implement this method to load data or other state from external data sources or services.
     * This is a template method -- callers should call `loadAsync()` or `refreshAsync()` instead.
     *
     * @param loadSpec - metadata about the underlying request. Implementations should
     *      take care to pass this parameter in calls to any delegates that support it, e.g.
     *      when calling the `loadAsync()` method of other services or child models with
     *      `loadSupport` or when making calls to the core {@see FetchService} APIs.
     */
    doLoadAsync(loadSpec: LoadSpec)
}