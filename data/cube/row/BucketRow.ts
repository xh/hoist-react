/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {BaseRow} from './BaseRow';
import {BucketSpec} from '../BucketSpec';
import {View} from '../View';

/**
 *  Row within a dataset produced by a Cube / View representing aggregated data on a dimension that
 *  has been further grouped into a dynamic child "bucket" - a subset of the dimension-level
 *  {@link AggregateRow} produced as per a specified {@link BucketSpecFn}.
 *
 * This is an internal data structure - {@link ViewRowData} is the public row-level data API.
 */
export class BucketRow extends BaseRow {
    override get isBucket() {
        return true;
    }

    readonly bucketSpec: BucketSpec = null;

    constructor(
        view: View,
        id: string,
        children: BaseRow[],
        bucketVal: any,
        bucketSpec: BucketSpec,
        appliedDimensions: PlainObject
    ) {
        super(view, id);

        this.bucketSpec = bucketSpec;
        this.data.cubeRowType = 'bucket';
        this.data.cubeLabel = bucketSpec.labelFn(bucketVal);
        this.data.cubeDimension = bucketSpec.name;

        this.initAggregate(children, bucketSpec.name, bucketVal, appliedDimensions);

        this.noteBucketed(bucketSpec, bucketVal);
    }
}
