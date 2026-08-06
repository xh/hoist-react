/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject, Some} from '@xh/hoist/core';
import {ViewRowData} from '@xh/hoist/data/cube/ViewRowData';
import {shallowEqualObjects} from '@xh/hoist/utils/impl';
import {compact, isEmpty} from 'lodash';
import {CubeField} from '../CubeField';
import {View} from '../View';
import {RowUpdate} from './RowUpdate';

/**
 * Send a set of updates up both aggregation routes.
 *
 * `applyDataUpdate` rewrites each {@link RowUpdate}'s `oldValue` / `newValue` in place as it walks,
 * and `Aggregator.replace` reads them - so when a row has two parents the second must get its own
 * copies, or it would apply the first route's aggregated delta instead of this row's.
 *
 * @internal
 */
export function propagateUpdate(
    parent: BaseRow,
    pivotParent: BaseRow,
    updates: RowUpdate[],
    updatedRows: Set<BaseRow>
) {
    if (parent && pivotParent) {
        const forPivot = updates.map(u => new RowUpdate(u.field, u.oldValue, u.newValue));
        parent.applyDataUpdate(updates, updatedRows);
        pivotParent.applyDataUpdate(forPivot, updatedRows);
    } else {
        (parent ?? pivotParent)?.applyDataUpdate(updates, updatedRows);
    }
}

/**
 * Base class for a row within a dataset produced by a Cube / View.
 *
 * This is an internal data structure - {@link ViewRowData} is the public row-level data API.
 */
export abstract class BaseRow {
    readonly view: View = null;
    readonly id: string = null;

    // readonly, but set by subclasses. A full ViewRowData for all rows except hidden leaves,
    // which adopt their cube record's plain data object - see LeafRow and subclasses.
    data: PlainObject;
    parent: BaseRow = null;
    /**
     * Second aggregation parent, used by pivot views to propagate up the pivot axis in addition to
     * the group axis. Null for every row in a plain View.
     *
     * The two routes must reach disjoint sets of ancestors - see {@link PivotLatticeResult}.
     */
    pivotParent: BaseRow = null;
    children: BaseRow[] = null;
    locked: boolean = false;
    canAggregate: PlainObject;

    /** Fields this row aggregates - the View's full set, or just the value fields for a cell row. */
    protected aggFields: CubeField[] = null;

    get isLeaf() {
        return false;
    }
    get isAggregate() {
        return false;
    }
    get isBucket() {
        return false;
    }

    constructor(view: View, id: string) {
        this.view = view;
        this.id = id;
    }

    //-----------------------
    // For all rows types
    //------------------------
    // Sync `cubeBuckets` on this row and all descendants from the current ancestor BucketRows.
    syncBuckets(parentBuckets: PlainObject) {
        const {data} = this,
            buckets = this.extendBuckets(parentBuckets);

        if (!shallowEqualObjects(data.cubeBuckets, buckets)) {
            data.cubeBuckets = buckets;
            this.view.noteRowDataMutated(data);
        }

        this.children?.forEach(it => it.syncBuckets(buckets));
    }

    // Determine what should be exposed as the actual children in the
    // row data.  This where we lock, skip degenerate rows, etc.
    getVisibleDatas(): Some<ViewRowData> {
        const {view, data, isLeaf} = this,
            {query} = view,
            {omitRedundantNodes, provideLeaves, includeLeaves} = query;

        // 1) Get children nodes recursively
        let dataChildren = this.getChildrenDatas();

        // End hierarchy at cube leaves, if so configured. But be sure to hold on to them if needed
        if (dataChildren && !includeLeaves && dataChildren[0]?.isCubeLeaf) {
            if (provideLeaves) {
                data._cubeLeafChildren = dataChildren;
            }
            dataChildren = null;
        }

        // 2) If omitting ourselves, we are done, return visible children.
        if (!isLeaf && query.omitFn?.(this as any)) return dataChildren;

        // 3) Otherwise, we can attach this data to the children data and return.

        // 3a) Before attaching examine that we don't have a chain of redundant nodes
        // (not sure if loop needed -- are these redundant relations transitive?)
        if (omitRedundantNodes) {
            const rowCache = view._rowCache;
            while (dataChildren?.length === 1) {
                const childRow = rowCache.get(dataChildren[0].id);
                if (childRow && this.isRedundantChild(this, childRow)) {
                    dataChildren = childRow.data.children;
                } else {
                    break;
                }
            }
        }

        // Wire up visible data children and leaves, as needed.
        data.children = dataChildren;
        return data as ViewRowData;
    }

    private getChildrenDatas(): ViewRowData[] {
        let {children, view} = this,
            {query} = view;

        if (
            isEmpty(children) ||
            (children[0].isLeaf && !query.includeLeaves && !query.provideLeaves)
        ) {
            return null;
        }

        // Skip all children in a locked node
        if (query.lockFn?.(this as any)) {
            this.locked = true;
            return null;
        }

        // Recurse
        const ret = compact(children.flatMap(it => it.getVisibleDatas()));
        return !isEmpty(ret) ? ret : null;
    }

    // Bucket context applying to this row and its descendants - BucketRow extends with own entry.
    protected extendBuckets(parentBuckets: PlainObject): PlainObject {
        return parentBuckets;
    }

    private isRedundantChild(parent: any, child: any) {
        const parentDim = parent.dim,
            childDim = child.dim;
        return (
            childDim &&
            parentDim &&
            childDim.parentDimension === parentDim.name &&
            child.data[childDim.name] === parent.data[parentDim.name]
        );
    }

    //-----------------------------------
    // Called by aggregates and buckets
    //----------------------------------
    /**
     * @param fields - fields to aggregate, defaulting to all of the View's fields. Pivot cell rows
     *      pass only the query's value fields (plus their declared dependencies), which is what
     *      keeps cell aggregation proportional to the measures rather than the full field set.
     */
    protected initAggregate(
        children: BaseRow[],
        dimOrBucketName: string,
        val: any,
        appliedDimensions: PlainObject,
        fields: CubeField[] = this.view.fields
    ) {
        this.children = children;
        children.forEach(it => (it.parent = this));
        this.initAggregateData(dimOrBucketName, val, appliedDimensions, fields);
    }

    /**
     * Compute this row's aggregates over its already-assigned `children`, without touching the
     * children's parent links. Split out for pivot cell rows, whose children do not uniformly treat
     * them as their group-axis parent.
     */
    protected initAggregateData(
        dimOrBucketName: string,
        val: any,
        appliedDimensions: PlainObject,
        fields: CubeField[] = this.view.fields,
        canAggregate?: PlainObject
    ) {
        const {data} = this;

        // No explicit nulling - `View.newRowData` clones a template carrying every field slot.
        Object.assign(data, appliedDimensions);

        this.canAggregate =
            canAggregate ??
            this.computeCanAggregate(dimOrBucketName, val, appliedDimensions, fields);

        // Retained so RowCache's argless recompute-on-reuse aggregates this row's own field set.
        this.aggFields = fields;
        this.computeAggregates();
    }

    /**
     * Build this row's `canAggregate` map. Callers may instead pass a precomputed map to
     * `initAggregateData`, shared across rows of identical shape - pivot views pass one per pivot
     * path, since an object plus a field walk per cell row is a real cost at these counts.
     */
    protected computeCanAggregate(
        dimOrBucketName: string,
        val: any,
        appliedDimensions: PlainObject,
        fields: CubeField[]
    ): PlainObject {
        // Clone the per-View template (all fields false) for fixed shape, then overwrite. Only
        // `fields` is walked, so a cell row's non-value fields stay false as the template left them.
        const {view} = this,
            ret = {...view._canAggregateTemplate},
            ctx = view._aggContext;

        fields.forEach(field => {
            const {name} = field;
            if (!appliedDimensions.hasOwnProperty(name)) {
                const {aggregator, canAggregateFn} = field;
                ret[name] =
                    aggregator &&
                    (!canAggregateFn ||
                        canAggregateFn(dimOrBucketName, val, appliedDimensions, ctx));
            }
        });
        return ret;
    }

    applyDataUpdate(childUpdates: RowUpdate[], updatedRows: Set<BaseRow>) {
        const {parent, pivotParent, canAggregate, data, children} = this,
            ctx = this.view._aggContext,
            myUpdates = [];
        childUpdates.forEach(update => {
            const {field} = update,
                {name} = field;
            if (canAggregate[name]) {
                const oldValue = data[name],
                    newValue = field.aggregator.replace(children, oldValue, update, ctx);
                update.oldValue = oldValue;
                update.newValue = newValue;
                myUpdates.push(update);
                data[name] = newValue;
            }
        });

        if (!isEmpty(myUpdates)) {
            updatedRows.add(this);
            propagateUpdate(parent, pivotParent, myUpdates, updatedRows);
        }
    }

    /**
     * Compute aggregated values in place for all eligible fields.
     */
    computeAggregates() {
        const {children, canAggregate, view, data} = this,
            ctx = view._aggContext;
        this.aggFields.forEach(({aggregator, name}) => {
            if (canAggregate[name]) {
                data[name] = aggregator.aggregate(children, name, ctx);
            }
        });
    }

    /** Recompute complex-aggregator fields on a reused row, returning true if any changed. */
    recomputeComplexAggregates(): boolean {
        const {children, canAggregate, view, data} = this,
            ctx = view._aggContext;
        let changed = false;
        this.aggFields.forEach(({aggregator, name}) => {
            if (canAggregate[name] && !aggregator.dependsOnChildrenOnly) {
                const val = aggregator.aggregate(children, name, ctx);
                if (data[name] !== val) {
                    data[name] = val;
                    changed = true;
                }
            }
        });
        return changed;
    }
}
