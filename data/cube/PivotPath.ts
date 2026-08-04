/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {CubeField} from './CubeField';

/**
 * One ordered tuple of pivot dimension values within a {@link PivotView} result - e.g.
 * `US >> Equity`. Maps to one rendered column or column group.
 *
 * Instances are immutable and identity-stable while the pivot structure is unchanged, which is what
 * lets consumers skip rebuilding columns. Treat the tree as read-only: mutating `children` corrupts
 * the view's own state.
 *
 * @see PivotViewResult.paths
 */
export class PivotPath {
    /** Pivot dimension at this depth. Null for the root path. */
    readonly dimension: CubeField;

    /** Raw dimension value, null for an empty (null / blank) segment. */
    readonly value: any;

    /** Display string - the query's `emptyPathLabel` for an empty segment. */
    readonly label: string;

    /** Escaped, delimiter-joined path key. '' for the root path. */
    readonly key: string;

    /** 0 for the root path, 1 for a top-level pivot value, and so on. */
    readonly depth: number;

    /** True where this segment stands for a null or blank dimension value. */
    readonly isEmpty: boolean;

    readonly children: PivotPath[] = [];

    /** @internal - constructed by PivotView. */
    constructor(config: {
        dimension: CubeField;
        value: any;
        label: string;
        key: string;
        depth: number;
        isEmpty: boolean;
    }) {
        Object.assign(this, config);
    }

    get isRoot(): boolean {
        return this.depth === 0;
    }
}

/**
 * A single materialized measure within a {@link PivotView} result - the pairing of a pivot path with
 * a value field, and the synthetic field name its value is written to on row data.
 *
 * `PivotGridModel` declares one Store field per entry and binds value columns to `name`.
 */
export interface PivotCellField {
    /** Field name on published row data. The value field's own name at the root path. */
    name: string;

    path: PivotPath;

    /** Source measure - supplies type and defaultValue when declaring Store fields. */
    valueField: CubeField;
}
