/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {CubeField} from '../CubeField';
import {PivotPath} from '../PivotPath';
import {PivotView} from '../PivotView';
import {BaseRow} from './BaseRow';
import {ParentRow} from './ParentRow';

/**
 * Row representing one `(group node, pivot path)` cell in a {@link PivotView}.
 *
 * These are real rows in the aggregation network - which is what lets every existing
 * {@link Aggregator} work on them unmodified, and lets `View`'s incremental machinery maintain them
 * on a tick - but they are never part of the visible row tree and never reach a connected Store.
 * Their values are copied onto their owning group row's data by `PivotView`.
 *
 * Deliberately not an {@link AggregateRow}: cells never enter `getVisibleDatas`, and keeping them
 * out of that type leaves the `omitFn` / `lockFn` signatures untouched.
 *
 * This is an internal data structure.
 */
export class PivotCellRow extends ParentRow {
    declare readonly view: PivotView;

    // Both are rebound on every reuse from `_rowCache` - the id pins what they *name*, not which
    // object names it, and PivotView mints fresh owners and paths on each rebuild. Any state added
    // here must be in the id, a function of `children`, or reassigned by `PivotView.buildCellRows`.
    /** Group row this cell's value is projected onto. */
    ownerRow: BaseRow;
    path: PivotPath;

    protected get dimOrBucketName(): string {
        return this.path.dimension?.name;
    }

    protected get dimOrBucketVal(): any {
        return this.path.value;
    }

    // Cells aggregate the query's value fields alone, which is what keeps cell aggregation
    // proportional to the measures rather than the full field set.
    protected override get aggFields(): CubeField[] {
        return this.view._cellAggFields;
    }
    protected override get aggFieldNames(): Set<string> {
        return this.view._cellAggFieldNames;
    }
    protected override get canAggregateFnFields(): CubeField[] {
        return this.view._cellCanAggregateFnFields;
    }
    protected override get complexAggFields(): CubeField[] {
        return this.view._cellComplexAggFields;
    }

    constructor(
        view: PivotView,
        id: string,
        children: BaseRow[],
        ownerRow: BaseRow,
        path: PivotPath
    ) {
        super(view, id);

        this.data = {};
        this.ownerRow = ownerRow;
        this.path = path;

        // Children are wired here, but `parent` / `pivotParent` are assigned by PivotView from the
        // lattice - a cell's children do not uniformly treat it as their group-axis parent.
        this.children = children;
        this.initData(EMPTY_DIMS, null);
    }
}

/** Cells apply no dimension of their own; shared so each cell row does not allocate one. */
const EMPTY_DIMS: PlainObject = Object.freeze({});
