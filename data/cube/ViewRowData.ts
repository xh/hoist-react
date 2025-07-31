/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {PlainObject, Some} from '@xh/hoist/core';
import {flatMap} from 'lodash';

/**
 * Grouped node data returned by query execution against cube,
 * and views.
 *
 * Designed for direct consumption by hierarchical stores and their associated
 * tree grids.
 * @see View.stores.
 * @see View.result.
 */
export class ViewRowData implements PlainObject {
    constructor(id: string) {
        this.id = id;
    }

    /** Unique id. */
    id: string;

    /**
     * Label of the row.  The dimension value of the row, or the underlying cubeId in the
     * case of a leaf row.
     *
     * Suitable for rendering, although applications may typically wish to customize the
     * rendering of leaf rows.
     */
    cubeLabel: string;

    /**
     * Dimension this row was computed on.
     *
     * Null for leaf rows.
     */
    cubeDimension: string;

    /**
     * For Buckets this row appears in
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

    /**
     * Is this row a leaf row directly from the cube (i.e. not a grouped aggregation).
     */
    get isCubeLeaf(): boolean {
        return this.cubeDimension == null;
    }

    /**
     * Cube leaves for this row.
     *
     * Will return all visible (i.e. non-locked) cube leaves associated with this row.
     *
     * To use this property, be sure to set the 'includeCubeLeaves' or 'provideCubeLeaves' property
     * on the underlying Query.
     */
    get cubeLeaves(): Some<ViewRowData> {
        if (this.isCubeLeaf) return this;
        return this._cubeLeafChildren ?? flatMap(this.children, 'cubeLeaves');
    }

    //------------------
    // Implementation
    //-----------------
    /** @internal */
    _cubeLeafChildren: ViewRowData[];
}
