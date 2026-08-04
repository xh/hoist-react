/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Some} from '@xh/hoist/core';
import {flatMap} from 'lodash';

/**
 * Grouped node data, as returned by {@link Cube.executeQuery} or exposed via {@link View.result}.
 * Designed for direct consumption by hierarchical stores and their associated tree grids.
 *
 * @mcpHint row shape returned by Cube queries and View results
 */
export interface ViewRowData {
    /** Unique id. */
    id: string;

    /** Denotes a type for the row */
    cubeRowType: 'leaf' | 'aggregate' | 'bucket';

    /**
     * Label of the row. The dimension value or, for leaf rows. the underlying cubeId.
     * Suitable for display, although apps will typically wish to customize leaf row rendering.
     */
    cubeLabel: string;

    /** Dimension on which this row was computed, or null for leaf rows. */
    cubeDimension: string;

    /**
     * Buckets this row appears in
     */
    cubeBuckets: Record<string, any>;

    /**
     * Visible children of this row.
     *
     * Note that this may not be the same as the simple aggregation children of this row.  In
     * particular, this property is subject to the semantics of row locking, redundant row omission,
     * and bucketing as defined by the Query.
     */
    children: ViewRowData[];

    /** True for leaf rows loaded into the cube (i.e. not a grouped aggregation). */
    isCubeLeaf: boolean;

    /** Monotonic stamp updated on each create or mutation - see `StoreConfig.reuseRecords`. */
    cubeRowVersion: number;

    /**
     * Support all other string keys for application fields in source data.
     */
    [key: string]: any;

    //------------------
    // Implementation
    //-----------------
    /** @internal */
    _cubeLeafChildren: ViewRowData[];
}

/**
 * All visible (i.e. non-locked) cube leaves associated with a row.
 *
 * For this to be populated, either {@link Query.includeLeaves} or {@link Query.provideLeaves}
 * must have been set on the underlying Query.
 */
export function getCubeLeaves(row: ViewRowData): Some<ViewRowData> {
    if (row.isCubeLeaf) return row;
    return row._cubeLeafChildren ?? flatMap(row.children, getCubeLeaves);
}
