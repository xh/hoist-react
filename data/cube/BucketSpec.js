/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

export class BucketSpec {

    name;
    bucketFn;
    labelFn;

    /**
     * @param {string} name - name of bucket.
     * @param {BucketFn} bucketFn - function to determine which (if any) bucket the given row should
     *      be placed into
     * @param {BucketLabelFn} labelFn - function to generate the bucket row label.
     **/
    constructor(name, bucketFn, labelFn) {
        this.name = name;
        this.bucketFn = bucketFn;
        this.labelFn = labelFn ?? ((b) => b);
    }
}

/**
 * @callback BucketFn
 *
 * Function which is used to determine which bucket (if any) a given row should be placed into.
 *
 * @param {BaseRow} row - the row being checked
 * @returns {string|null} - the bucket to place the row into, or null if row should not be bucketed
 */

/**
 * @callback BucketLabelFn
 *
 * Function which generates a label for a bucket row.
 *
 * @param {string} bucket - the name of the bucket returned by the BucketFn.
 * @returns {string} - the label for the bucket row
 */
