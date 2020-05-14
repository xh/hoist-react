/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

export class Aggregator {

    /**
     * Aggregate values
     * @param {Object[]} rows - current rows in aggregation.  Will never be empty.
     * @param {string} fieldName - name of field to perform the aggregation on.
     */
    aggregate(rows, fieldName) {}


    /**
     * Adjust an aggregated value, by replacing one of its constituent components.
     *
     * @param {Object[]} rows - current rows in aggregation.  Will never be empty.
     * @param {*} currVal - current value of aggregation
     * @param {RowUpdate} update - update that occurred to child of this aggregation.
     * Sub-classes may use this method to provide efficient implementations for dynamic changes
     * to an aggregation.  The default implementation will simply re-aggregate.
     * @returns {*} - new aggregate value
     */
    replace(rows, currVal, update) {
        return this.aggregate(rows, update.field.name);
    }


    /**
     * Call function on all *leaf* children of a set of children.
     *
     * @param {Array} rows - array of child rows
     * @param {function} fn - the function to call on each leaf.
     *
     * @returns {Array}
     */
    forEachLeaf(rows, fn) {
        for (const row of rows) {
            if (row.isLeaf) {
                fn(row);
            } else {
                this.forEachLeaf(row.children, fn);
            }
        }
    }
}