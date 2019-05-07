/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

export class Aggregator {

    /**
     * Aggregate values
     */
    aggregate(records, fieldName) {}

    /**
     * Adjust an aggregated value, by replacing one of its constituent components.
     *
     * @param {Record[]} records - current records in aggregation.  Will never be empty.
     * @param {any} currAgg - current value of aggregation
     * @param {Object} change - description of change
     *
     *
     * Sub-classes may use this method to provide efficient implementations for dynamic changes
     * to an aggregation.  The default implementation will simply re-aggregate.
     */
    replace(records, currAgg, change) {
        return this.aggregate(records, change.field.name);
    }
}