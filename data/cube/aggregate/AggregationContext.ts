/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
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
     * Name of the field currently being aggregated - set by row implementations immediately before
     * each call into an aggregator, and used to identify the aggregator in error messages.
     * @internal
     */
    activeFieldName: string = null;

    /**
     * All records currently meeting the filter for this view.
     *
     * Available only when an aggregator on the view overrides
     * {@link Aggregator.dependsOnChildrenOnly} to return false - the View then rebuilds its
     * filtered records before every aggregation pass. Views with children-only aggregators update
     * incrementally without refreshing that collection, so reading it here throws.
     */
    get filteredRecords(): StoreRecord[] {
        const {view} = this;
        // Note error message built lazily - this getter is called throughout aggregation.
        if (view.aggregatorsAreSimple) {
            throw XH.exception(
                `${this.activeAggregatorDescription} read \`filteredRecords\` but does not override \`dependsOnChildrenOnly\` to return false. ` +
                    'Aggregators reading records beyond their own children must do so.'
            );
        }
        return view._records.list;
    }

    constructor(view: View) {
        this.view = view;
        this.appData = {};
    }

    /** Identify the in-progress aggregator by its class + field, for error reporting. */
    private get activeAggregatorDescription(): string {
        const {activeFieldName, view} = this,
            aggregator = activeFieldName ? view.getField(activeFieldName)?.aggregator : null;

        return aggregator
            ? `${aggregator.constructor.name} for the ${activeFieldName} field`
            : 'An aggregator on this Cube View';
    }
}
