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

    data = null;
    children = null;
    aggregateFields = null;

    constructor(fields, id, children, dim, val, appliedDimensions) {
        this.children = children;
        this.data = {id, cubeLabel: val};
        this.aggregateFields = this.selectAggFields(fields, dim, val, appliedDimensions);

        if (dim) this.data[dim.name] = val;
        this.computeAggregates();
    }

    get isAggregate() {return true}

    computeAggregates() {
        const {children, aggregateFields, data} = this;
        aggregateFields.forEach(({aggregator, name}) => {
            data[name] = aggregator.aggregate(children, name);
        });
    }

    //-------------------
    // Implementation
    //-------------------
    selectAggFields(fields, dim, val, appliedDimensions) {
        return fields.filter(field => {
            if (field === dim) return false;
            const dimName = dim ? dim.name : 'Total',
                {aggregator, canAggregateFn} = field;
            return aggregator && (!canAggregateFn || canAggregateFn(dimName, val, appliedDimensions));
        });
    }
}