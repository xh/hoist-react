/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {CubeField} from '../CubeField';
import {View} from '../View';
import {BaseRow} from './BaseRow';

/**
 *  Object used by views to gather Aggregate rows.
 */
export class AggregateRow extends BaseRow {
    override get isAggregate() {
        return true;
    }

    readonly dim: CubeField = null; // null for summary row
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
