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
import {View} from '../View';
import type {ParentRow} from './ParentRow';

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
    parent: ParentRow = null;
    children: BaseRow[] = null;

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
        } else {
            data._cubeLeafChildren = null;
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

        // Skip all children in a locked node - only parent rows can get this far.
        if (query.lockFn) {
            const row = this as unknown as ParentRow;
            row.locked = query.lockFn(row as any);
            if (row.locked) return null;
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
}
