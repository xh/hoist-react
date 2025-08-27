/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {CubeField} from '../CubeField';
import {View} from '../View';
import {BaseRow} from './BaseRow';

/**
 *  Row within a dataset produced by a Cube / View representing aggregated data on a dimension.
 *
 * This is an internal data structure - {@link ViewRowData} is the public row-level data API.
 */
export class AggregateRow extends BaseRow {
    override get isAggregate() {
        return true;
    }

    /** The dimension for which this row is aggregating data. Null for a top-level summary row. */
    readonly dim: CubeField = null;
    readonly dimName: string = null;

    constructor(
        view: View,
        id: string,
        children: BaseRow[],
        dim: CubeField,
        val: any,
        strVal: string,
        appliedDimensions: PlainObject
    ) {
        super(view, id);
        const dimName = dim ? dim.name : 'Total';

        this.dim = dim;
        this.dimName = dimName;
        this.data.cubeLabel = strVal;
        this.data.cubeDimension = dimName;

        this.initAggregate(children, dimName, val, appliedDimensions);
    }
}
