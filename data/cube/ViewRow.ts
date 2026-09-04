/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';

/**
 * A row within a dataset produced by a Cube / View, as passed to application-provided hooks -
 * {@link Aggregator} implementations, {@link LockFn}, {@link OmitFn}, and {@link BucketSpecFn}.
 *
 * Note the distinction from {@link ViewRowData}, which is a row's *data* as published to Views
 * and their connected Stores. Rows are the structure the Cube aggregates over; row data is the
 * output of that aggregation.
 *
 * @mcpHint row object passed to Cube aggregators and row-level Query hooks
 */
export interface ViewRow {
    /** Unique id - the source cube record id for leaf rows, a dimension-path id for others. */
    id: string;

    /**
     * Field values for this row - aggregated values for non-leaf rows. A full {@link ViewRowData}
     * for all rows other than leaves excluded from results, which instead adopt their cube
     * record's own data object.
     */
    data: PlainObject;

    /** Parent of this row, or null at the top of the hierarchy. */
    parent: ViewRow;

    /**
     * Rows aggregated by this row, or null for a leaf. Note these are the *aggregation* children -
     * see {@link ViewRowData.children} for the visible children, which are additionally subject to
     * row locking, redundant row omission, and bucketing.
     */
    children: ViewRow[];

    /** True for a row holding a single source record loaded into the Cube. */
    isLeaf: boolean;

    /** True for a row aggregating all rows sharing a single dimension value. */
    isAggregate: boolean;

    /** True for a row aggregating a dynamic bucket - see {@link BucketSpecFn}. */
    isBucket: boolean;

    /** True if this row's children have been hidden from results by the Query's `lockFn`. */
    locked?: boolean;
}
