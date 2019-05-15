/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {CubeRecord} from './CubeRecord';

export class AggregateCubeRecord extends CubeRecord {

    /** @member {Field} */
    dim = null;
    isLeaf = false;

    constructor(fields, id, children, dim, val, appliedDimensions) {
        super(fields);

        const data = {id, cubeLabel: val};
        if (dim) {
            this.dim = dim;
            data[dim.name] = val;
        }
        this.data = data;

        children.forEach(it => it.parent = this);
        this.children = children;

        this.eachField((field, name) => {
            if (field !== dim) {
                const {aggregator, canAggregateFn} = field,
                    canAgg = aggregator && (!canAggregateFn || canAggregateFn(dim.name, val, appliedDimensions));

                data[name] = canAgg ? aggregator.aggregate(children, name) : null;
            }
        });
    }
}