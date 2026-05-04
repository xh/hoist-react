/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Exception} from '@xh/hoist/exception';
import {Span} from '../Span';
import {PlainObject} from '../types/Types';
import {LoadSupport} from './';

/**
 * Configuration for a {@link LoadSpec} - the inputs callers may supply via
 * {@link LoadSupport.loadAsync} when triggering a managed load.
 *
 * @see LoadSpec
 * @see LoadSupport
 */
export type LoadSpecConfig = {
    /** True if triggered by a refresh request (automatic or user-driven). */
    isRefresh?: boolean;
    /** True if triggered by an automatic refresh process. */
    isAutoRefresh?: boolean;
    /**
     * Application-specific information about the load request. Optional on input - the
     * resulting `LoadSpec.meta` will default to an empty object when omitted.
     */
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

    /**
     * Application-specific information about the load request. Always defined - defaults to an
     * empty object when not provided by the caller, so consumers can read keys without a null
     * check on `meta` itself.
     */
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
     * Populated from `LoadSpecConfig.span` (set by callers). May be `null` if no caller
     * context is provided.
     */
    span: Span;

    /** True if a more recent request to load this object's owner has *started*. */
    get isStale(): boolean {
        return this.owner.lastRequested?.loadNumber > this.loadNumber;
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
     * True if this load has been superseded per the owning `Loadable`'s `abortMode`:
     * - `'never'`: always false.
     * - `'onStale'` (default): true once a newer load has *started*.
     * - `'onObsolete'`: true once a newer load has *successfully completed*.
     */
    get shouldAbort(): boolean {
        const mode = this.owner.target.abortMode ?? 'onStale';
        if (mode === 'never') return false;
        return mode === 'onStale' ? this.isStale : this.isObsolete;
    }

    /**
     * Throw a {@link LoadAbortedException} if {@link shouldAbort} is true.
     *
     * Called automatically by {@link FetchService} after each fetch carrying this spec.
     * Application code may call directly for non-fetch async work that should also abort
     * when the load is superseded.
     */
    abortIfNeeded(): void {
        if (this.shouldAbort) throw Exception.loadAborted();
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
     * @internal
     */
    cloneWithSpan(span: Span): LoadSpec {
        const ret = Object.create(Object.getPrototypeOf(this)) as LoadSpec;
        Object.assign(ret, this, {span});
        Object.freeze(ret);
        return ret;
    }
}
