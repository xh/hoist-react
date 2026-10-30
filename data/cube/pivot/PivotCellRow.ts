/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {CubeField} from '../CubeField';
import {PivotPath} from './PivotPath';
import type {View} from '../View';
import {BaseRow} from '../row/BaseRow';
import {ParentRow} from '../row/ParentRow';

/**
 * Row for one `(group node, pivot path)` cell of a pivoted {@link View} - see `PivotCells`.
 *
 * A real row in the aggregation network, so aggregators and incremental updates work unmodified,
 * but never part of the visible tree or a Store - its values are copied onto its owner row. Not an
 * {@link AggregateRow}, so `omitFn` / `lockFn` never see it. Internal.
 */
export class PivotCellRow extends ParentRow {
    // Rebound on every reuse from `_rowCache` - the id pins what they name, not which object. Any
    // state added here must be in the id, derived from `children`, or reassigned by PivotCells.
    /** Group row this cell's value is projected onto. */
    ownerRow: BaseRow;
    path: PivotPath;

    /** Cell field names last projected onto `ownerRow`, so a later generation can null any it no longer writes. */
    projectedCellNames: string[] = null;

    protected get dimOrBucketName(): string {
        return this.path.dimension?.name;
    }

    protected get dimOrBucketVal(): any {
        return this.path.value;
    }

    // Cells aggregate the value fields alone.
    protected override get aggFields(): CubeField[] {
        return this.view._pivot.cellAggFields;
    }
    protected override get aggFieldNames(): Set<string> {
        return this.view._pivot.cellAggFieldNames;
    }
    protected override get canAggregateFnFields(): CubeField[] {
        return this.view._pivot.cellCanAggregateFnFields;
    }
    protected override get complexAggFields(): CubeField[] {
        return this.view._pivot.cellComplexAggFields;
    }

    // Parent links are assigned by PivotCells - children do not uniformly treat a cell as their
    // group-axis parent.
    protected override adoptChildren(children: BaseRow[]) {
        this.children = children;
    }

    constructor(view: View, id: string, children: BaseRow[], ownerRow: BaseRow, path: PivotPath) {
        super(view, id);

        this.data = view._pivot.newCellRowData();
        this.ownerRow = ownerRow;
        this.path = path;

        this.adoptChildren(children);
        this.initData(EMPTY_DIMS, null);
    }
}

/** Cells apply no dimension of their own; shared so each cell row does not allocate one. */
const EMPTY_DIMS: PlainObject = Object.freeze({});
