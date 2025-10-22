/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {Some} from '@xh/hoist/core';
import {flatMap} from 'lodash';

type CubeRowType = 'leaf' | 'aggregate' | 'bucket';
/**
 * Grouped node data, as returned by {@link Cube.executeQuery} or exposed via {@link View.result}.
 * Designed for direct consumption by hierarchical stores and their associated tree grids.
 */
export class ViewRowData {
    constructor(id: string, cubeRowType: CubeRowType) {
        this.id = id;
        this.cubeRowType = cubeRowType;
    }

    /** Unique id. */
    id: string;

    /** Denotes a type for a row */
    cubeRowType: CubeRowType;

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
    get isCubeLeaf(): boolean {
        return this.cubeDimension == null;
    }

    /** Is a row a bucket? (CLOSED or FLAT). */
    get isBucket(): boolean {
        return this.cubeRowType === 'bucket';
    }

    /**
     * All visible (i.e. non-locked) cube leaves associated with this row.
     *
     * For this to be populated, either {@link Query.includeLeaves} or {@link Query.provideLeaves}
     * must have been set on the underlying Query.
     */
    get cubeLeaves(): Some<ViewRowData> {
        if (this.isCubeLeaf) return this;
        return this._cubeLeafChildren ?? flatMap(this.children, 'cubeLeaves');
    }

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
