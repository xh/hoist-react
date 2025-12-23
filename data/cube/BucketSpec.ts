/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {BaseRow} from './row/BaseRow';
import {SetOptional} from '@xh/hoist/core';

/**
 * Spec to define a bucketing level within the hierarchy of data returned by a Query, as identified
 * by a set of rows passed to a {@link BucketSpecFn} configured on that Query (or defaulted from
 * the Cube). If this object is returned for a candidate set of rows, each row is evaluated by the
 * spec's `bucketFn` to determine if it should yield a value for the bucket, causing the row to be
 * nested underneath a new {@link BucketRow} created to hold all rows with that value.
 */
export class BucketSpec {
    /** Name for the bucketing level configured by this spec - equivalent to a dimension name. */
    name: string;

    /**
     * Function returning the bucketed value (if any) into which the given row should be placed -
     * equivalent to a dimension value. Return null/undefined to exclude the row from bucketing.
     */
    bucketFn: (row: BaseRow) => string;

    /**
     * Function returning bucket row label from the bucket value string returned by bucketFn.
     * Defaults to using the value directly.
     */
    labelFn: (bucket: string) => string;

    /**
     * Fields on which the `bucketFn` depends, to ensure rows are re-bucketed if dependent field
     * values change. If not provided or does not cover all fields potentially accessed by
     * `bucketFn`, an incremental "data only" update that should have changed a row's bucket can
     * fail to do so.
     */
    dependentFields: string[];

    constructor(config: SetOptional<BucketSpec, 'labelFn' | 'dependentFields'>) {
        this.name = config.name;
        this.bucketFn = config.bucketFn;
        this.labelFn = config.labelFn ?? (b => b);
        this.dependentFields = config.dependentFields ?? [];
    }
}
