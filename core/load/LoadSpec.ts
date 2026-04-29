/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Span} from '@xh/hoist/utils/telemetry';
import {PlainObject} from '../types/Types';
import {LoadSupport} from './';

export type LoadSpecConfig = {
    /** True if triggered by a refresh request (automatic or user-driven). */
    isRefresh?: boolean;
    /** True if triggered by an automatic refresh process. */
    isAutoRefresh?: boolean;
    /** Application-specific information about the load request. */
    meta?: PlainObject;
    /** Optional caller-provided span to use as the parent for spans within this load. */
    span?: Span;
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

    /**
     * Current trace span for work happening within this load. Used as parent by nested
     * `FetchService` calls (via `loadSpec` propagation) and any nested `loadAsync` calls.
     *
     * Populated by `LoadSupport` from `LoadSpecConfig.span` and/or the target's
     * `loadSpan`. May be `null` if no caller context is provided and the target does
     * not opt in to auto-tracing.
     */
    span: Span;

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
        const {isRefresh, isAutoRefresh, meta, span} = config;
        this.isRefresh = !!(isRefresh || isAutoRefresh);
        this.isAutoRefresh = !!isAutoRefresh;
        this.meta = meta ?? {};
        this.owner = owner;
        this.span = span ?? (config instanceof LoadSpec ? config.span : null);

        const last = owner.lastRequested;
        this.loadNumber = last ? last.loadNumber + 1 : 0;
        this.dateCreated = new Date();

        Object.freeze(this);
    }

    /**
     * Return a clone of this `LoadSpec` with `span` replaced.
     */
    withChildSpan(span: Span): LoadSpec {
        const ret = Object.create(Object.getPrototypeOf(this)) as LoadSpec;
        Object.assign(ret, this, {span});
        Object.freeze(ret);
        return ret;
    }
}
