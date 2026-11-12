/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {AggregationContext} from './AggregationContext';
import {Aggregator} from './Aggregator';
import type {ViewRow} from '../ViewRow';

let markerSeq = 0;

/**
 * Takes the median of numeric values across all leaf rows, skipping nulls. Returns null if no leaf
 * has a value.
 *
 * A median cannot be composed from child medians, so each aggregation walks and sorts the values
 * beneath the row. An update to a leaf does this for every ancestor of that leaf.
 *
 * A row whose `canAggregateFn` returned false contributes its published null, not the leaves
 * beneath it.
 */
export class MedianAggregator extends Aggregator {
    override aggregate(rows, fieldName, context) {
        const vals: number[] = [];
        this.collectValues(rows, fieldName, context, vals);

        // Marks this row as aggregated for the walk. A new marker on every aggregation makes the
        // View re-aggregate the parent, whose median can change while this row's median holds.
        context.setAggState({seq: ++markerSeq});
        if (!vals.length) return null;

        // Sorts in place, where lodash `sortBy` would copy.
        vals.sort((a, b) => a - b);
        const mid = Math.floor(vals.length / 2);
        return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    }

    private collectValues(
        rows: ViewRow[],
        fieldName: string,
        context: AggregationContext,
        vals: number[]
    ) {
        for (const row of rows) {
            // Descend only into rows that aggregated the field - see `getAggState()`.
            if (!row.isLeaf && context.getAggState(row)) {
                this.collectValues(row.children, fieldName, context, vals);
            } else {
                const val = row.data[fieldName];
                if (val != null) vals.push(val);
            }
        }
    }
}
