/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

export class Aggregator {


    /**
     * Does this aggregator depend only on leaf nodes contained by the node being aggregated?
     *
     * By default this property returns true, indicating to the cube that if all children of a
     * given node are the same, the node does not need to be re-aggregated.  Aggregators that
     * depend on global values (e.g. % of total) should return false for this value.
     */
    get dependsOnChildrenOnly() {
        return true;
    }

    /**
     * Aggregate values
     * @param {Object[]} rows - current rows in aggregation.  Will never be empty.
     * @param {string} fieldName - name of field to perform the aggregation on.
     * @param {AggregationContext} context - current aggregation context
     */
    aggregate(rows, fieldName, context) {}


    /**
     * Adjust an aggregated value, by replacing one of its constituent components.
     *
     * @param {Object[]} rows - current rows in aggregation.  Will never be empty.
     * @param {*} currVal - current value of aggregation
     * @param {RowUpdate} update - update that occurred to child of this aggregation.
     * Sub-classes may use this method to provide efficient implementations for dynamic changes
     * to an aggregation.  The default implementation will simply re-aggregate.
     * @param {AggregationContext} context - current aggregation context
     * @returns {*} - new aggregate value
     */
    replace(rows, currVal, update, context) {
        return this.aggregate(rows, update.field.name, context);
    }


    /**
     * Call function on all *leaf* children of a set of children.
     *
     * @param {Array} rows - array of child rows
     * @param {function} fn - the function to call on each leaf.
     *
     * @returns {boolean}
     */
    forEachLeaf(rows, fn) {
        for (const row of rows) {
            if (row.isLeaf) {
                const res = fn(row);
                if (res === false) return false;
            } else {
                const res = this.forEachLeaf(row.children, fn);
                if (res === false) return false;
            }
        }
        return true;
    }
}
