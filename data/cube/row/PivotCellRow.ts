/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {CubeField} from '../CubeField';
import {PivotPath} from '../PivotPath';
import {View} from '../View';
import {BaseRow} from './BaseRow';

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
export class PivotCellRow extends BaseRow {
    /** Group row this cell's value is projected onto. */
    readonly ownerRow: BaseRow;

    readonly path: PivotPath;

    /** Index of `path` within the view's flat path list - keys into its cached field names. */
    readonly pathIdx: number;

    constructor(
        view: View,
        id: string,
        children: BaseRow[],
        ownerRow: BaseRow,
        path: PivotPath,
        pathIdx: number,
        valueFields: CubeField[],
        canAggregate: PlainObject
    ) {
        super(view, id);

        this.data = {} as PlainObject;
        this.ownerRow = ownerRow;
        this.path = path;
        this.pathIdx = pathIdx;

        // Children are wired here, but `parent` / `pivotParent` are assigned by PivotView from the
        // lattice - a cell's children do not uniformly treat it as their group-axis parent.
        this.children = children;
        this.initAggregateData(
            path.dimension?.name,
            path.value,
            EMPTY_DIMS,
            valueFields,
            canAggregate
        );
    }
}

/** Cells apply no dimension of their own; shared so each cell row does not allocate one. */
const EMPTY_DIMS: PlainObject = Object.freeze({});
