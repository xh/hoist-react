/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {BaseRow} from './BaseRow';

/**
 *  Object used by views to gather bucket rows.
 */
export class BucketRow extends BaseRow {
    get isBucket()  {return true}

    bucketSpec = null;

    constructor(view, id, children, bucketVal, bucketSpec, appliedDimensions) {
        super(view, id);

        this.bucketSpec = bucketSpec;
        this.data.cubeLabel = bucketSpec.labelFn(bucketVal);
        this.data.cubeDimension = bucketSpec.name;

        this.initAggregate(children, bucketSpec.name, bucketVal, appliedDimensions);

        this.noteBucketed(bucketSpec, bucketVal);
    }
}
