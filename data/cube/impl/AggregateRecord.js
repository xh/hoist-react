/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

/**
 * @private
 *
 * pseudo-record used by views to gather Aggregate rows
 */
export class AggregateRecord {

    isAggregate = true;
    dim = null;
    data = null;
    children = null;

    constructor(fields, id, children, dim, val, appliedDimensions) {

        this.children = children;

        const data = {id, cubeLabel: val};
        if (dim) {
            this.dim = dim;
            data[dim.name] = val;
        }
        this.data = data;


        fields.forEach(field => {
            if (field !== dim) {
                const {name} = field,
                    dimName = dim ? dim.name : 'Total',
                    {aggregator, canAggregateFn} = field,
                    canAgg = aggregator && (!canAggregateFn || canAggregateFn(dimName, val, appliedDimensions));

                data[name] = canAgg ? aggregator.aggregate(children, name) : null;
            }
        });
    }
}