/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

/**
 * Metadata describing a load/refresh request in Hoist.
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

    get isLoadSpec()    {return true}

    /** @member {number} - index of the associated load on this object. 0 for the first load. */
    loadNumber;

    /** @member {boolean} - true if triggered by a refresh request (automatic or user). */
    isRefresh;

    /** @member {boolean} - true if triggered by an automatic refresh process. */
    isAutoRefresh;

    /** @member {Date} - time the load started. */
    dateCreated;

    /** @member {LoadSupport} - owner of this object. */
    owner;

    /**
     * @member {boolean} - true if a more recent request to load this object's owner has started.
     */
    get isStale() {
        return this !== this.owner._lastRequested;
    }

    /**
     * @member {boolean} - true if a more recent request to load this object's owner has
     *      successfully completed.
     */
    get isObsolete() {
        return this.owner._lastSucceeded?.loadNumber > this.loadNumber;
    }

    get typeDisplay() {
        if (this.isAutoRefresh) return 'Auto-Refresh';
        if (this.isRefresh)     return 'Refresh';
        return 'Load';
    }

    /**
     * @private - not for application use.
     * LoadSpecs are constructed by `LoadSupport` API wrappers.
     */
    constructor({isRefresh, isAutoRefresh, owner}) {
        const last = owner._lastRequested;
        this.loadNumber = last ? last.loadNumber + 1 : 0;
        this.isRefresh = !!(isRefresh || isAutoRefresh);
        this.isAutoRefresh = !!isAutoRefresh;
        this.owner = owner;
        this.dateCreated = new Date();
        Object.freeze(this);
    }
}
