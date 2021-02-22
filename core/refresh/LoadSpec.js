/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

/**
 * Metadata describing Load/Refresh request in Hoist.
 *
 * This object is create by LoadSupport, and passed to implementations of doLoadAsync().
 *
 * Application implementations of doLoadAsync() should consult this object's flags. Of particular
 * interest are the 'isLatest' and the 'isObsolete properties', which implementations can use to
 * determine if they should abandon any in-progress state modifications.  'isLatest' will be false
 * if there is a pending load which is newer than this load.  'isObsolete' will return true if
 * there is a newer load has successfully completed.
 *
 * In addition, implementations of doLoadAsync() should typically pass along this object to
 * any delegating calls to loadAsync() on other objects, as well as all calls to FetchServices.
 *
 * {@see LoadSupport}
 */
export class LoadSpec {

    get isLoadSpec()    {return true}

    /** @member {number} - index of the associated load on this object.  0 for the first load. */
    loadNumber;

    /** @member {number} - true if this load was triggered by a refresh request (automatic or user). */
    isRefresh;

    /** @member {number} - true if this load was triggered by an automatic refresh process. */
    isAutoRefresh;

    /** @member {Date} - time the load started. */
    dateCreated;

    /** @member {LoadSupport} - owner of this object. */
    owner;

    /**
     * @member {boolean} - true if there is exists a more recent request to load this object.
     */
    get isStale() {
        return this === this.owner._lastRequested;
    }

    /**
     * @member {boolean} - true if a more recent request to load this object has already
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
     *  @private
     *  Not for application use.  Used by LoadSupport.
     */
    constructor({isRefresh, isAutoRefresh, owner}) {
        const last = owner._lastRequested;
        this.loadNumber = last ? last.loadNumber + 1 : 0;
        this.isRefresh = isRefresh || isAutoRefresh;
        this.isAutoRefresh = isAutoRefresh;
        this.owner = owner;
        this.dateCreated = new Date();
        Object.freeze(this);
    }
}
