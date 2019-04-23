/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

Ext.define('XH.cube.aggregate.Aggregator', {

    /**
     * Aggregate values
     */
    aggregate(records, fieldName) {},

    /**
     * Adjust an aggregated value, by replacing one of its constituent components.
     *
     * @param records, current records in aggregation.  Will never be empty.
     * @param currAgg, current value of aggregation
     * @param change, FieldChange
     *
     *
     * Sub-classes may use this method to provide efficient implementations for dynamic changes
     * to an aggregation.  The default implementation will simply re-aggregate.
     */
    replace(records, currAgg, change) {
        return this.aggregate(records, change.field.name);
    }
});