/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {LoadSupport} from './LoadSupport';

/**
 * Object describing a load/refresh request in Hoist.
 *
 * Instances of this class are created within the public API wrappers provided by the `LoadSupport`
 * base class and are passed to subclass (i.e. application code) implementations of `doLoadAsync()`.
 *
 * Application implementations of `doLoadAsync()` can consult this object's flags. Of particular
 * interest are the `isStale` and `isObsolete` properties, which implementations can read after any
 * async calls return to determine if a newer, subsequent load has already been requested:
 *
 *   + `isStale` will be true if any loads have been *started* after the run being evaluated.
 *   + `isObsolete` will return true if there is a newer load which has successfully *completed*.
 *
 * In addition, `doLoadAsync()` implementations should typically pass along this object to any
 * calls they make to `loadAsync()` on other objects, as well as all calls to `FetchService` APIs.
 *
 * Note that Hoist's exception handling and activity tracking will consult the `isAutoRefresh` flag
 * on specs associated with their calls to automatically adjust their behavior (e.g. not showing an
 * exception dialog on error, not tracking background refresh activity).
 *
 * {@see LoadSupport}
 */
export class LoadSpec {

    get isLoadSpec(): boolean    {return true}

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
    meta: object;

    /** True if a more recent request to load this object's owner has started. */
    get isStale(): boolean {
        return this !== this.owner.lastRequested;
    }

    /** True if a more recent request to load this object's owner has successfully completed.*/
    get isObsolete(): boolean {
        return this.owner.lastSucceeded?.loadNumber > this.loadNumber;
    }

    /**
     * display type of refresh for troubleshooting and logging.
     */
    get typeDisplay(): string {
        if (this.isAutoRefresh) return 'Auto-Refresh';
        if (this.isRefresh)     return 'Refresh';
        return 'Load';
    }

    /**
     * Construct this object.
     *
     * Not for direct application use -- LoadSpecs are constructed by Hoist internally.
     */
    constructor({isRefresh, isAutoRefresh, meta, owner}) {
        this.isRefresh = !!(isRefresh || isAutoRefresh);
        this.isAutoRefresh = !!isAutoRefresh;
        this.meta = meta ?? {};
        this.owner = owner;

        const last = owner._lastRequested;
        this.loadNumber = last ? last.loadNumber + 1 : 0;
        this.dateCreated = new Date();

        Object.freeze(this);
    }
}
