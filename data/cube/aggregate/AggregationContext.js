/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */


/**
 * Context provided to aggregators.
 *
 * This context will remain over the lifetime of an aggregation update of a view, and can therefore
 * be used by aggregators to accumulate or cache values needed for the current set of records.
 * It will be replaced if the current set of records is being changed in any way.
 */
export class AggregationContext {

    /** @member {View} - view being aggregated. */
    view;

    /** @member {StoreRecord[]} - all records currently meeting the filter for this view.*/
    filteredRecords;

    /**
     * @member {Object} - app data.
     * Custom aggregators may use to store pre-computed values.  Custom aggregators should
     * take care to appropriately namespace any data stored within this object.
     */
    appData;

    constructor(view, filteredRecords) {
        this.view = view;
        this.filteredRecords = filteredRecords;
        this.appData = {};
    }
}

