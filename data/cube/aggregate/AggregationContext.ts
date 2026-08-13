/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
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

    /**
     * All records currently meeting the filter for this view.
     *
     * Available only when an aggregator on the view declares
     * {@link Aggregator.dependsOnChildrenOnly} as false - the View then rebuilds its filtered
     * records before every aggregation pass. Views with children-only aggregators update
     * incrementally without refreshing that collection, so reading it here throws.
     */
    get filteredRecords(): StoreRecord[] {
        const {view} = this;
        throwIf(
            view.aggregatorsAreSimple,
            'filteredRecords is available only when an aggregator declares `dependsOnChildrenOnly` as false - aggregators depending on records beyond their own children must do so.'
        );
        return view._records.list;
    }

    constructor(view: View) {
        this.view = view;
        this.appData = {};
    }
}
