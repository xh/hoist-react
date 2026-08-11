/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {StoreRecord} from '../../StoreRecord';
import {View} from '../View';

/**
 * Context provided to aggregators.
 *
 * This context will remain over the lifetime of an aggregation update of a view, and can therefore
 * be used by aggregators to accumulate or cache values needed for the current set of records.
 * It will be replaced if the current set of records is being changed in any way.
 */
export class AggregationContext {
    /** View being aggregated. */
    view: View;

    /**
     * Custom aggregators may use to store pre-computed values.  Custom aggregators should
     * take care to appropriately namespace any data stored within this object.
     */
    appData: any;

    private _records: StoreRecord[] = null;

    /** All records currently meeting the filter for this view. Materialized lazily on first read.*/
    get filteredRecords(): StoreRecord[] {
        return (this._records ??= Array.from(this.view._recordMap.values()));
    }

    constructor(view: View) {
        this.view = view;
        this.appData = {};
    }
}
