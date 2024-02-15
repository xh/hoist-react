/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {BaseRow} from './BaseRow';
import {BucketSpec} from '../BucketSpec';
import {View} from '../View';

/**
 *  Object used by views to gather bucket rows.
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
        this.data.cubeLabel = bucketSpec.labelFn(bucketVal);
        this.data.cubeDimension = bucketSpec.name;

        this.initAggregate(children, bucketSpec.name, bucketVal, appliedDimensions);

        this.noteBucketed(bucketSpec, bucketVal);
    }
}
