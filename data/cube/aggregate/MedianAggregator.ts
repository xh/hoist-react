/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {shallowEqualArrays} from '@xh/hoist/utils/impl';
import {sortedIndex, sortedIndexOf} from 'lodash';
import type {AggregationContext} from './AggregationContext';
import {Aggregator} from './Aggregator';
import type {ViewRow} from '../ViewRow';

/**
 * Takes the median of numeric values across all leaf rows, skipping nulls. Returns null if no leaf
 * has a value.
 *
 * A median cannot be composed from child medians, so each row holds the sorted values beneath it
 * as aggregator state. A full aggregation walks and sorts those values. An update to a leaf moves
 * its value within the sorted values of each ancestor - a binary search, then an array shift
 * linear in the number of values.
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
        return this.median(vals);
    }

    override replace(rows, currVal, update, context) {
        const state: MedianState = context.getAggState();
        if (!state) return super.replace(rows, currVal, update, context);

        const {vals} = state,
            {leafOldValue, leafNewValue} = update;
        if (leafOldValue != null) {
            const idx = sortedIndexOf(vals, leafOldValue);
            // Not expected - state out of step with the leaves, so rebuild it.
            if (idx < 0) return super.replace(rows, currVal, update, context);
            vals.splice(idx, 1);
        }
        if (leafNewValue != null) {
            vals.splice(sortedIndex(vals, leafNewValue), 0, leafNewValue);
        }
        return this.median(vals);
    }

    private median(vals: number[]): number {
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
