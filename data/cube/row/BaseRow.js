/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {has, isEmpty, reduce} from 'lodash';


/**
 * Base class for a view row.
 */
export class BaseRow {

    view = null;
    id = null;
    parent = null;
    children = null;
    data;

    get isLeaf()        {return false}
    get isAggregate()   {return false}
    get isBucket()      {return false}

    constructor(view, id) {
        this.view = view;
        this.id = id;
        this.data = {id, _meta: this};
    }

    //-----------------------
    // For all rows types
    //------------------------
    noteBucketed(bucketSpec, bucketVal) {
        this.data.buckets = this.data.buckets ?? {};
        this.data.buckets[bucketSpec.name] = bucketVal;
        this.children?.forEach(it => it.noteBucketed(bucketSpec, bucketVal));
    }

    // Determine what should be exposed as the actual children in the
    // row data.  This where we lock, skip degenerate rows, etc.
    applyVisibleChildren() {
        let {children, view, data} = this,
            {lockFn, omitFn} = view.cube;

        if (!children);

        // Remove all children from the data if the query is not configured to include leaves and
        // this row has leaves as children
        if (!view.query.includeLeaves && children[0]?.isLeaf) {
            data.children = null;
            return;
        }

        // Check if we need to 'lock' this row - removing all children from the data so they will not
        // appear in the UI but remain as children of this AggregateMeta to ensure that updates to
        // those child rows will update our aggregate value
        if (lockFn && lockFn(this)) {
            this.locked = true;
            data.children = null;
            return;
        }

        // Apply recursively -- we need to go depth first to allow recursive collapsing
        children.forEach(it => it.applyVisibleChildren());

        // Skip cullable single children, by wiring up to *their* data children.
        if (children.length === 1) {
            const childRow = children[0];
            if (this.isRedundantChild(childRow) || (omitFn && omitFn(childRow))) {
                data.children = childRow.data.children;
                return;
            }
        }

        // ...otherwise wire up to your own children's data
        data.children = children.map(it => it.data);
    }

    isRedundantChild(row) {
        // TODO:  put this test in application code omitFn instead?
        const {parent} = row,
            parentDim = parent.dim,
            dim = row.dim;
        return dim &&
            parentDim &&
            dim.parentDimension === parentDim.name &&
            row.data[dim.name] === parent.data[parentDim.name];
    }

    //-----------------------------------
    // Called by aggregates and buckets
    //----------------------------------
    initAggregate(children, dimOrBucketName, val, appliedDimensions) {
        const {view, data} = this;

        this.children = children;
        children.forEach(it => it.parent = this);

        view.fields.forEach(({name}) => data[name] = null);
        Object.assign(data, appliedDimensions);

        this.canAggregate = reduce(view.fields, (ret, field) => {
            const {name} = field;
            if (has(appliedDimensions, field)) {
                ret[name] = false;
            } else {
                const {aggregator, canAggregateFn} = field;
                ret[name] = aggregator && (!canAggregateFn || canAggregateFn(dimOrBucketName, val, appliedDimensions));
            }
            return ret;
        }, {});

        this.computeAggregates();
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

    computeAggregates() {
        const {children, canAggregate, view, data} = this;
        view.fields.forEach(({aggregator, name}) => {
            if (canAggregate[name]) {
                data[name] = aggregator.aggregate(children, name);
            }
        });
    }
}
