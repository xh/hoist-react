/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {AggregationContext} from './AggregationContext';
import {BaseRow} from '../row/BaseRow';
import {LeafRow} from '../row/LeafRow';
import {RowUpdate} from '../row/RowUpdate';

export abstract class Aggregator {
    /**
     * Does this aggregator depend only on leaf nodes contained by the node being aggregated?
     *
     * By default this property returns true, indicating to the cube that if all children of a
     * given node are the same, the node does not need to be re-aggregated.  Aggregators that
     * depend on global values (e.g. % of total) should return false for this value.
     */
    get dependsOnChildrenOnly(): boolean {
        return true;
    }

    /**
     * Aggregate values
     * @param rows - current rows in aggregation.  Will never be empty.
     * @param fieldName - name of field to perform the aggregation on.
     * @param context - current aggregation context
     */
    abstract aggregate(rows: BaseRow[], fieldName: string, context: AggregationContext);

    /**
     * Adjust an aggregated value, by replacing one of its constituent components.
     *
     * @param rows - current rows in aggregation.  Will never be empty.
     * @param currVal - current value of aggregation
     * @param update - update that occurred to child of this aggregation.
     *      Sub-classes may use this method to provide efficient implementations for dynamic changes
     *      to an aggregation.  The default implementation will simply re-aggregate.
     * @param context - current aggregation context
     * @returns new aggregate value
     */
    replace(rows: BaseRow[], currVal: any, update: RowUpdate, context: AggregationContext): any {
        return this.aggregate(rows, update.field.name, context);
    }

    /**
     * Call function on all *leaf* children of a set of children.
     *
     * @param rows - array of child rows
     * @param fn - the function to call on each leaf.
     */
    protected forEachLeaf(rows: BaseRow[], fn: (leaf: LeafRow) => boolean | void): boolean {
        for (const row of rows) {
            if (row.isLeaf) {
                const res = fn(row as LeafRow);
                if (res === false) return false;
            } else {
                const res = this.forEachLeaf(row.children, fn);
                if (res === false) return false;
            }
        }
        return true;
    }
}
