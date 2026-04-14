/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '../types/Types';
import {LoadSupport} from './';

export type LoadSpecConfig = {
    /** True if triggered by a refresh request (automatic or user-driven). */
    isRefresh?: boolean;
    /** True if triggered by an automatic refresh process. */
    isAutoRefresh?: boolean;
    /** Application-specific information about the load request. */
    meta?: PlainObject;
};

/**
 * Immutable descriptor for a load/refresh request, passed to `doLoadAsync()` implementations.
 *
 * Instances are created automatically by {@link LoadSupport} when `loadAsync()`,
 * `refreshAsync()`, or `autoRefreshAsync()` are called. Application code should not construct
 * LoadSpec instances directly.
 *
 * Within `doLoadAsync()`, check {@link isStale} after any async call to determine if a newer
 * load has already been requested - if so, return early to avoid applying outdated results.
 * Check {@link isAutoRefresh} to adjust behavior for background refreshes (e.g. skip expensive
 * operations, avoid user-facing error dialogs).
 *
 * Pass this object along to any nested `loadAsync()` calls and to all {@link FetchService}
 * requests. Hoist's exception handling and activity tracking consult the LoadSpec to
 * automatically suppress error dialogs and skip tracking for auto-refresh operations.
 *
 * @see LoadSupport
 * @see HoistModel.doLoadAsync
 */
export class LoadSpec {
    /** True if triggered by a refresh request (automatic or user-driven). */
    isRefresh: boolean;

    /** True if triggered by an automatic refresh process. */
    isAutoRefresh: boolean;

    /** Application specific information about the load request. */
    meta: PlainObject;

    /** Time the load started. */
    dateCreated: Date;

    /** Index of the associated load on this object - 0 for the first load. */
    loadNumber: number;

    /** Owner of this object. */
    owner: LoadSupport;

    /** True if a more recent request to load this object's owner has *started*. */
    get isStale(): boolean {
        return this !== this.owner.lastRequested;
    }

    /** True if a more recent request to load this object's owner has *successfully completed*. */
    get isObsolete(): boolean {
        return this.owner.lastSucceeded?.loadNumber > this.loadNumber;
    }

    /** Display type of refresh for troubleshooting and logging. */
    get typeDisplay(): string {
        if (this.isAutoRefresh) return 'Auto-Refresh';
        if (this.isRefresh) return 'Refresh';
        return 'Load';
    }

    get isFirstLoad(): boolean {
        return this.loadNumber === 0;
    }

    /**
     * @internal - not for application use. LoadSpecs are constructed automatically by Hoist's
     * {@link LoadSupport} class as part of its managed `loadAsync()` wrapper.
     */
    constructor(config: LoadSpecConfig, owner: LoadSupport) {
        const {isRefresh, isAutoRefresh, meta} = config;
        this.isRefresh = !!(isRefresh || isAutoRefresh);
        this.isAutoRefresh = !!isAutoRefresh;
        this.meta = meta ?? {};
        this.owner = owner;

        const last = owner.lastRequested;
        this.loadNumber = last ? last.loadNumber + 1 : 0;
        this.dateCreated = new Date();

        Object.freeze(this);
    }
}
