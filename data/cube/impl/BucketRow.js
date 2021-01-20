/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {has, isEmpty, reduce} from 'lodash';
import {Cube} from '../Cube';

/**
 *  Object used by views to gather bucket rows.
 *
 *  Not intended to be used directly by applications.
 */

export function createBucketRow(view, id, children, bucketVal, bucketSpec, appliedDimensions) {
    const data = {};
    data._meta = new BucketMeta(data, view, id, children, bucketVal, bucketSpec, appliedDimensions);
    return data;
}

class BucketMeta {

    view = null;
    children = null;
    parent = null;
    bucketSpec = null;

    get isLeaf()    {return false}
    get isBucket()  {return true}

    constructor(data, view, id, children, bucketVal, bucketSpec, appliedDimensions) {

        this.view = view;
        this.id = id;
        this.children = children.map(it => it._meta);
        this.children.forEach(it => it.parent = this);
        this.data = data;
        this.bucketSpec = bucketSpec;

        data.id = id;
        data.cubeLabel = bucketSpec.labelFn(bucketVal);
        data.cubeDimension = bucketSpec.name;

        view.fields.forEach(({name}) => data[name] = null);
        Object.assign(data, appliedDimensions);

        this.markAggFields(bucketVal, appliedDimensions);
        this.computeAggregates();
        this.applyVisibleChildren();
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
        const {view, bucketSpec} = this,
            bucketName = bucketSpec.name;

        this.canAggregate = reduce(view.fields, (ret, field) => {
            const {name} = field;
            if (has(appliedDimensions, field)) {
                ret[name] = false;
            } else {
                const {aggregator, canAggregateFn} = field;
                ret[name] = aggregator && (!canAggregateFn || canAggregateFn(bucketName, val, appliedDimensions));
            }
            return ret;
        }, {});
    }

    // Process child rows to determine what should be exposed as the actual children in the row data
    applyVisibleChildren() {
        const {children, view, data} = this,
            {lockFn} = view.cube;

        // Check if we need to 'lock' this row - removing all children from the data so they will not
        // appear in the UI but remain as children of this AggregateMeta to ensure that updates to
        // those child rows will update our aggregate value
        if (lockFn && lockFn(this)) {
            this.locked = true;
            data.children = null;
            return;
        }

        // If we've gotten past all of the above checks then our data children should consist of
        // all of this row's children
        data.children = children.map(it => it.data);
    }
}
