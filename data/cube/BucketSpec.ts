/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {BaseRow} from './row/BaseRow';

/**
 * @see BucketSpecFn
 */
export class BucketSpec {
    name: string;
    dependentFields: string[];
    bucketFn: (row: BaseRow) => string;
    labelFn: (bucket: string) => string;

    /**
     * @param name - name of bucket.
     * @param bucketFn - function to determine which (if any) bucket the given row should
     *      be placed into
     * @param labelFn - function to generate the bucket row label from name returned by bucketFn
     * @param dependentFields - fields which the bucketFn depends on, to ensure rows are re-bucketed
     *      if dependent field values change
     **/
    constructor(
        name: string,
        bucketFn: (row: BaseRow) => string,
        labelFn?: (bucket: string) => string,
        dependentFields?: string[]
    ) {
        this.name = name;
        this.bucketFn = bucketFn;
        this.labelFn = labelFn ?? (b => b);
        this.dependentFields = dependentFields ?? [];
    }
}
