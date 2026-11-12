/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {shallowEqualArrays} from '@xh/hoist/utils/impl';
import type {AggregationContext} from './AggregationContext';
import {Aggregator} from './Aggregator';
import type {ViewRow} from '../ViewRow';

/**
 * Takes the median of numeric values across all leaf rows, skipping nulls. Returns null if no leaf
 * has a value.
 *
 * A median cannot be composed from child medians, so each aggregation walks and sorts the values
 * beneath the row. An update to a leaf does this for every ancestor of that leaf, once per updated
 * leaf, so a large batch of updates to a large View is costly. Best suited to Views of modest size
 * or with infrequent updates.
 *
 * A row whose `canAggregateFn` returned false contributes its published null, not the leaves
 * beneath it.
 */
export class MedianAggregator extends Aggregator {
    override aggregate(rows, fieldName, context) {
        const vals: number[] = [];
        this.collectValues(rows, fieldName, context, vals);

        // Sorts in place, where lodash `sortBy` would copy.
        vals.sort((a, b) => a - b);

        // Holds the sorted values as state, which marks this row as aggregated for the walk. New
        // state when the values change makes the View re-aggregate the parent, whose median can
        // change while this row's median holds. Unchanged values keep the prior state, so the
        // row is not marked as changed.
        const prev: MedianState = context.getAggState();
        context.setAggState(prev && shallowEqualArrays(prev.vals, vals) ? prev : {vals});
        if (!vals.length) return null;

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

interface MedianState {
    /** Sorted non-null values beneath the row. */
    vals: number[];
}
