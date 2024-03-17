/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {LoadSupport} from './';
import {PlainObject} from '../types/Types';

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
export class LoadSpec {
    get isLoadSpec(): boolean {
        return true;
    }

    /** index of the associated load on this object. 0 for the first load. */
    loadNumber: number;

    /** True if triggered by a refresh request (automatic or user). */
    isRefresh: boolean;

    /** true if triggered by an automatic refresh process. */
    isAutoRefresh: boolean;

    /** Time the load started. */
    dateCreated: Date;

    /** Owner of this object. */
    owner: LoadSupport;

    /** Application specific information about the load request */
    meta: PlainObject;

    /** True if a more recent request to load this object's owner has *started*. */
    get isStale(): boolean {
        return this !== this.owner.lastRequested;
    }

    /** True if a more recent request to load this object's owner has *successfully completed*. */
    get isObsolete(): boolean {
        return this.owner.lastSucceeded?.loadNumber > this.loadNumber;
    }

    /**
     * display type of refresh for troubleshooting and logging.
     */
    get typeDisplay(): string {
        if (this.isAutoRefresh) return 'Auto-Refresh';
        if (this.isRefresh) return 'Refresh';
        return 'Load';
    }

    /**
     * Construct this object.
     *
     * Not for direct application use -- LoadSpecs are constructed by Hoist internally.
     */
    constructor({isRefresh, isAutoRefresh, meta, owner}: Partial<LoadSpec>) {
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
