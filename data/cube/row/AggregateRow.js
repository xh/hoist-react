/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {BaseRow} from './BaseRow';

/**
 *  Object used by views to gather Aggregate rows.
 */
export class AggregateRow extends BaseRow {
    get isAggregate()   {return true}

    dim = null;         // null for summary row
    dimName = null;

    constructor(view, id, children, dim, val, appliedDimensions) {
        super(view, id);
        const dimName = dim ? dim.name : 'Total';

        this.dim = dim;
        this.dimName = dimName;
        this.data.cubeLabel = val;
        this.data.cubeDimension = dimName;

        this.initAggregate(children, dimName, val, appliedDimensions);
    }
}
