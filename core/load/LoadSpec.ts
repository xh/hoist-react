/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {apiDeprecated} from '@xh/hoist/utils/js';
import {PlainObject} from '../types/Types';
import {LoadSupport} from './';

/**
 * Object describing a load/refresh request in Hoist.
 *
 * Instances of this class are created within the public APIs provided by {@link LoadSupport}
 * and are passed to subclass (i.e. app-level) implementations of `doLoadAsync()`.
 *
 * Application implementations of `doLoadAsync()` can consult this object's flags. Of particular
 * interest are {@link isStale} and {@link isObsolete}, which implementations can read after any
 * async calls return to determine if a newer, subsequent load has already been requested.
 *
 * In addition, `doLoadAsync()` implementations should typically pass along this object to any
 * calls they make to `loadAsync()` on other objects + all calls to {@link FetchService} APIs.
 *
 * Note that Hoist's exception handling and activity tracking will consult the {@link isAutoRefresh}
 * flag on specs passed to their calls to automatically adjust their behavior (e.g. not showing an
 * exception dialog on error, not tracking background refresh activity).
 *
 * @see LoadSupport
 */

export type LoadSpecConfig = {
    /** True if triggered by a refresh request (automatic or user-driven). */
    isRefresh?: boolean;
    /** True if triggered by an automatic refresh process. */
    isAutoRefresh?: boolean;
    /** Application specific information about the load request. */
    meta?: PlainObject;
};

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

    /** @deprecated Applications should use `instanceof` instead of this property. */
    get isLoadSpec(): boolean {
        apiDeprecated('isLoadSpec', {v: '68', msg: 'Use `instanceof` instead.'});
        return true;
    }
}
