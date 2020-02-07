/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

/**
 * @private
 *
 *  Object used by views to gather Aggregate rows
 */
export class AggregateRow {

    constructor(view, id, children, dim, val, appliedDimensions) {
        const dimName = dim ? dim.name : 'Total';
        this._meta = {
            view,
            dim, // Grouping Dim or null for summary row
            dimName,
            children,
            isLeaf: false
        };
        this._meta.aggregateFields = this.selectAggFields(val, appliedDimensions);

        this.id = id;
        this.cubeLabel = val;
        this.cubeDimension = dimName;
        if (dim) this[dimName] = val;
        view.fields.forEach(({name}) => this[name] = null);

        children.forEach(it => it._meta.parent = this);

        this.computeAggregates();
        this.applyVisibleChildren();
    }

    computeAggregates() {
        const {children, aggregateFields} = this._meta;
        aggregateFields.forEach(({aggregator, name}) => {
            this[name] = aggregator.aggregate(children, name);
        });
    }

    //-------------------
    // Implementation
    //-------------------
    selectAggFields(val, appliedDimensions) {
        const {dim, dimName, view} = this._meta;

        return view.fields.filter(field => {
            if (field === dim) return false;
            const {aggregator, canAggregateFn} = field;
            return aggregator && (!canAggregateFn || canAggregateFn(dimName, val, appliedDimensions));
        });
    }

    applyVisibleChildren() {
        const {children, view, dim} = this._meta,
            {lockFn} = view.cube;

        // Hide hidden leaves.
        if (!view.query.includeLeaves && children[0]?._meta.isLeaf) {
            this.children = null;
            return;
        }

        // Hide locked children
        if (lockFn && lockFn(this)) {
            this.locked = true;
            this.children = null;
            return;
        }

        // ...or drill past single child if it is an identical 'child' dimension.
        if (children.length === 1) {
            const childRow = children[0],
                childDim = childRow._meta.dim;

            if (dim && childDim && childDim.parentDimension === dim.name &&
                childRow[childDim.name] === this[dim.name]) {
                this.children = childRow.children;
                return;
            }
        }

        // otherwise send them off into the world!
        this.children = children;
    }
}