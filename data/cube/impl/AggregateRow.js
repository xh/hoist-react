/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {has, isEmpty, reduce, groupBy, forEach} from 'lodash';
import {pluralize} from '@xh/hoist/utils/js';
import {Cube} from '../Cube';

/**
 *  Object used by views to gather Aggregate rows.
 *
 *  Not intended to be used directly by applications.
 */
export function createAggregateRow(view, id, children, dim, val, appliedDimensions) {

    const data = {};
    data._meta = new AggregateMeta(data, view, id, children, dim, val, appliedDimensions);
    return data;
}

class AggregateMeta {

    view = null;
    dim = null;         // Grouping Dim or null for summary row
    dimName = null;
    children = null;
    parent = null;

    get isLeaf() {return false}

    constructor(data, view, id, children, dim, val, appliedDimensions) {
        const dimName = dim ? dim.name : 'Total';

        this.view = view;
        this.dim = dim;
        this.dimName = dimName;
        this.children = children.map(it => it._meta);
        this.children.forEach(it => it.parent = this);
        this.data = data;

        data.id = id;
        data.cubeLabel = val;
        data.cubeDimension = dimName;

        view.fields.forEach(({name}) => data[name] = null);
        Object.assign(data, appliedDimensions);

        this.markAggFields(val, appliedDimensions);
        this.computeAggregates();
        this.applyVisibleChildren(appliedDimensions);
    }

    computeAggregates() {
        const {children, canAggregate, view, data} = this;
        view.fields.forEach(({aggregator, name}) => {
            if (canAggregate[name]) {
                data[name] = aggregator.aggregate(children, name);
            }
        });
    }

    applyDataUpdate(childUpdates, updatedRows) {
        const {parent, canAggregate, data, children} = this,
            myUpdates = [];
        childUpdates.forEach(update => {
            const {field} = update,
                {name} = field;
            if (canAggregate[name]) {
                const oldValue = data[name],
                    newValue = field.aggregator.replace(children, oldValue, update);
                if (oldValue !== newValue) {
                    update.oldValue = oldValue;
                    update.newValue = newValue;
                    myUpdates.push(update);
                    data[name] = newValue;
                }
            }
        });

        if (!isEmpty(myUpdates)) {
            updatedRows.add(this.data);
            if (parent) parent.applyDataUpdate(myUpdates, updatedRows);
        }
    }

    //-------------------
    // Implementation
    //-------------------
    markAggFields(val, appliedDimensions) {
        const {dimName, view} = this;

        this.canAggregate = reduce(view.fields, (ret, field) => {
            const {name} = field;
            if (has(appliedDimensions, field)) {
                ret[name] = false;
            } else {
                const {aggregator, canAggregateFn} = field;
                ret[name] = aggregator && (!canAggregateFn || canAggregateFn(dimName, val, appliedDimensions));
            }
            return ret;
        }, {});
    }

    applyVisibleChildren(appliedDimensions) {
        const {children, view, dim, data} = this,
            {lockFn, bucketFn} = view.cube;

        // Hide hidden leaves.
        if (!view.query.includeLeaves && children[0]?.isLeaf) {
            data.children = null;
            return;
        }

        // Hide locked children
        if (lockFn && lockFn(this)) {
            this.locked = true;
            data.children = null;
            return;
        }

        // ...or drill past single child if it is an identical 'child' or closed dimension.
        if (children.length === 1) {
            const childRow = children[0],
                childDim = childRow.dim;

            if (dim && childDim &&
                childDim.parentDimension === dim.name &&
                childRow.data[childDim.name] === data[dim.name]) {
                data.children = childRow.data.children;
                return;
            }
        } else if (bucketFn) {
            const byBucket = groupBy(children, (row) => bucketFn(row) ?? '__unbucketed__'),
                bucketedRows = [],
                unBucketedChildren = [],
                nextDim = this.findNextDim(dim);

            forEach(byBucket, (bucketChildren, bucket) => {
                if (bucket === '__unbucketed__' || bucketChildren.length === children.length) {
                    unBucketedChildren.push(...bucketChildren);
                } else {
                    const bucketLabel = this.generateBucketLabel(nextDim, bucket),
                        bucketRow = createAggregateRow(view, data.id + Cube.RECORD_ID_DELIMITER + bucket, bucketChildren.map(it => it.data), nextDim, bucketLabel, appliedDimensions);

                    bucketedRows.push(bucketRow);
                }
            });

            data.children = [...bucketedRows, ...unBucketedChildren.map(it => it.data)];
            return;

            /*
             // Split up our children into open and closed lists
             const [closedChildren, openChildren] = partition(children, row => bucketFn(row));
             if (!isEmpty(closedChildren) && closedChildren.length !== children.length) {
             // Push all closed children under a new aggregate row
             const nextDim = this.findNextDim(dim),
             value = this.generateBucketLabel(nextDim),
             closedRow = createAggregateRow(view, data.id + Cube.RECORD_ID_DELIMITER + 'CLOSED', closedChildren.map(it => it.data), nextDim, value, appliedDimensions);

             data.children = [closedRow, ...openChildren.map(it => it.data)];
             return;
             }
             */
        }

        // otherwise send them off into the world!
        data.children = children.map(it => it.data);
    }

    generateBucketLabel(dim, bucketLabel) {
        if (dim) return `${bucketLabel} ${pluralize(dim.displayName).toUpperCase()}`;

        const {leafUnit} = this.view.cube;
        return bucketLabel + (leafUnit ? ` ${pluralize(leafUnit).toUpperCase()}` : '');
    }

    findNextDim(dim) {
        const {view} = this,
            idx = view.query.dimensions.indexOf(dim) + 1; // This works for root row also since idx will be 0 - which is what we want

        return idx <= view.query.dimensions.length ? view.query.dimensions[idx] : null;
    }
}
