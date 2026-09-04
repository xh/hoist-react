/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {StoreRecord} from '../../StoreRecord';
import type {CubeField} from '../CubeField';
import type {ParentRow} from '../row/ParentRow';
import type {RowUpdate} from '../row/RowUpdate';
import type {ViewRow} from '../ViewRow';
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
     * Row currently being aggregated, or null if not within a call to an aggregator.
     * @internal
     */
    activeRow: ParentRow = null;

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
    aggregate(rows: ViewRow[], field: CubeField, row: ParentRow): any {
        this.activeField = field;
        this.activeRow = row;
        try {
            return field.aggregator.aggregate(rows, field.name, this);
        } finally {
            this.activeField = this.activeRow = null;
        }
    }

    /**
     * Adjust an aggregated value for a single child update, tracking the updated field as active
     * for the duration.
     * @internal
     */
    replace(rows: ViewRow[], currVal: any, update: RowUpdate, row: ParentRow): any {
        const {field} = update;
        this.activeField = field;
        this.activeRow = row;
        try {
            return field.aggregator.replace(rows, currVal, update, this);
        } finally {
            this.activeField = this.activeRow = null;
        }
    }

    /**
     * Store state for the row and field currently being aggregated, to be read by the
     * aggregations of ancestor rows via {@link getAggState}.
     *
     * This is the supported way to write an aggregator that cannot be composed from its
     * children's published values alone - e.g. a weighted average, which needs running weighted
     * and weight totals to combine its children. Such aggregators can then compose from their
     * direct children rather than walking their entire subtree of leaves. See the Cube package
     * README for a worked example.
     *
     * State must be written on every call to {@link Aggregator.aggregate}, as rows are recomputed
     * in place when reused across query results. An {@link Aggregator.replace} override must
     * likewise leave state consistent with the value it returns, or delegate to `super`.
     */
    setAggState<T>(state: T) {
        const {activeRow, activeField} = this;
        (activeRow.aggStates ??= {})[activeField.name] = state;
    }

    /**
     * Read the state stored by a row's aggregation of the active field - the row being aggregated
     * if not specified. Null for leaf rows, and for rows that did not aggregate the field because
     * their {@link CubeField.canAggregateFn} returned false.
     */
    getAggState<T>(row: ViewRow = this.activeRow): T {
        return (row as ParentRow).aggStates?.[this.activeField.name];
    }
}
