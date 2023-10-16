/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */

import {PlainObject, Some} from '@xh/hoist/core';
import {BucketSpec} from '@xh/hoist/data/cube/BucketSpec';
import {isEmpty, reduce} from 'lodash';
import {View} from '../View';
import {RowUpdate} from './RowUpdate';

/**
 * Base class for a view row.
 */
export abstract class BaseRow {
    readonly view: View = null;
    readonly id: string = null;
    readonly data: PlainObject;

    // readonly, but set by subclasses
    parent: BaseRow = null;
    children: BaseRow[] = null;
    locked: boolean = false;
    canAggregate: PlainObject;

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
        this.data = {id, _meta: this};
    }

    //-----------------------
    // For all rows types
    //------------------------
    noteBucketed(bucketSpec: BucketSpec, bucketVal: any) {
        this.data.buckets = this.data.buckets ?? {};
        this.data.buckets[bucketSpec.name] = bucketVal;
        this.children?.forEach(it => it.noteBucketed(bucketSpec, bucketVal));
    }

    // Determine what should be exposed as the actual children in the
    // row data.  This where we lock, skip degenerate rows, etc.
    getVisibleDatas(): Some<PlainObject> {
        let {view, data, isLeaf} = this;

        // 1) Get visible children nodes recursively
        let dataChildren = this.getVisibleChildrenDatas();

        // 2) If omitting ourselves, we are done, return visible children.
        if (!isLeaf && view.query.omitFn?.(this as any)) return dataChildren;

        // 3) Otherwise, we can attach this data to the children data and return.

        // 3a) Before attaching examine that we don't have a chain of redundant nodes
        // (not sure if loop needed -- are these redundant relations transitive?)
        while (dataChildren?.length === 1) {
            const childRow = dataChildren[0]._meta;
            if (this.isRedundantChild(this, childRow)) {
                dataChildren = childRow.data.children;
            } else {
                break;
            }
        }

        data.children = dataChildren;
        return data;
    }

    private getVisibleChildrenDatas(): PlainObject[] {
        let {children, view} = this;

        if (!children) return null;

        // Skip all leaves from the data if the query is not configured to include leaves and
        if (!view.query.includeLeaves && children[0]?.isLeaf) {
            return null;
        }

        // Skip all children in a locked node
        if (view.query.lockFn?.(this as any)) {
            this.locked = true;
            return null;
        }

        // Recurse
        return children.flatMap(it => it.getVisibleDatas());
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
    protected initAggregate(
        children: BaseRow[],
        dimOrBucketName: string,
        val: any,
        appliedDimensions: PlainObject
    ) {
        const {view, data} = this;

        this.children = children;
        children.forEach(it => (it.parent = this));

        view.fields.forEach(({name}) => (data[name] = null));
        Object.assign(data, appliedDimensions);

        this.canAggregate = reduce(
            view.fields,
            (ret, field) => {
                const {name} = field;
                if (appliedDimensions.hasOwnProperty(name)) {
                    ret[name] = false;
                } else {
                    const {aggregator, canAggregateFn} = field;
                    ret[name] =
                        aggregator &&
                        (!canAggregateFn ||
                            canAggregateFn(dimOrBucketName, val, appliedDimensions));
                }
                return ret;
            },
            {}
        );

        this.computeAggregates();
    }

    applyDataUpdate(childUpdates: RowUpdate[], updatedRowDatas: Set<PlainObject>) {
        const {parent, canAggregate, data, children} = this,
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
            updatedRowDatas.add(this.data);
            if (parent) parent.applyDataUpdate(myUpdates, updatedRowDatas);
        }
    }

    protected computeAggregates() {
        const {children, canAggregate, view, data} = this,
            ctx = view._aggContext;
        view.fields.forEach(({aggregator, name}) => {
            if (canAggregate[name]) {
                data[name] = aggregator.aggregate(children, name, ctx);
            }
        });
    }
}
