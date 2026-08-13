/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {StoreRecord} from '../../StoreRecord';
import {View} from '../View';
import {CubeField} from '@xh/hoist/data';

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
     * The cube field currently being aggregated - set by row implementations immediately before
     * each call into an aggregator, and used to identify the aggregator in error messages.
     * @internal
     */
    activeField: CubeField = null;

    /**
     * All records currently meeting the filter for this view.
     *
     * Available only when an aggregator on the view overrides
     * {@link Aggregator.dependsOnChildrenOnly} to return false.
     */
    get filteredRecords(): StoreRecord[] {
        const {activeField, view} = this,
            agg = activeField?.aggregator;
        if (agg?.dependsOnChildrenOnly) {
            const label = `${agg.constructor.name} for the ${activeField.name} field`;
            throw XH.exception(
                `${label} read \`filteredRecords\` but does not override \`dependsOnChildrenOnly\` to return false. `
            );
        }
        return view._records.list;
    }

    constructor(view: View) {
        this.view = view;
        this.appData = {};
    }
}
