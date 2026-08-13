/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {StoreRecord} from '../../StoreRecord';
import type {CubeField} from '../CubeField';
import type {BaseRow} from '../row/BaseRow';
import type {RowUpdate} from '../row/RowUpdate';
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
     * Field currently being aggregated, or null if not within a call to an aggregator.
     * @internal
     */
    activeField: CubeField = null;

    /**
     * All records currently meeting the filter for this view.
     *
     * Available only when an aggregator on the view overrides
     * {@link Aggregator.dependsOnChildrenOnly} to return false.
     * Views with children-only aggregators update incrementally without
     * refreshing that collection, so reading it here throws.
     */
    get filteredRecords(): StoreRecord[] {
        const {activeField, view} = this;
        if (activeField?.aggregator.dependsOnChildrenOnly) {
            throw XH.exception(
                `The aggregator for the '${activeField.name}' field read \`filteredRecords\`, but does not override \`dependsOnChildrenOnly\` to return false - aggregators depending on records beyond their own children must do so.`
            );
        }
        return view._records.list;
    }

    constructor(view: View) {
        this.view = view;
        this.appData = {};
    }

    /**
     * Aggregate the given rows for a field, tracking the field as active for the duration.
     * @internal
     */
    aggregate(rows: BaseRow[], field: CubeField): any {
        this.activeField = field;
        try {
            return field.aggregator.aggregate(rows, field.name, this);
        } finally {
            this.activeField = null;
        }
    }

    /**
     * Adjust an aggregated value for a single child update, tracking the updated field as active
     * for the duration.
     * @internal
     */
    replace(rows: BaseRow[], currVal: any, update: RowUpdate): any {
        const {field} = update;
        this.activeField = field;
        try {
            return field.aggregator.replace(rows, currVal, update, this);
        } finally {
            this.activeField = null;
        }
    }
}
