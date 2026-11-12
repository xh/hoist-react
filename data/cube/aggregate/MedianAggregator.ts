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
 * Suited to measures such as percentage returns, where one outlier would pull an average far from
 * the typical value.
 *
 * A median cannot be composed from its children's medians, so each aggregation walks the subtree
 * beneath the row and sorts the values found - including the re-aggregation that stands in for
 * {@link replace}, which runs for every ancestor of an updated leaf. The walk takes the published
 * value of any row that did not aggregate the field - see {@link AggregationContext.getAggState} -
 * rather than descending past it, so a row whose `canAggregateFn` returned false contributes null,
 * as with {@link AverageAggregator}.
 *
 * Each row stores a marker as aggregator state, to show the walk that it aggregated the field. The
 * marker is new on every aggregation, as a row's median can hold while the values beneath it
 * change, and its parent must still re-aggregate.
 */
export class MedianAggregator extends Aggregator {
    override aggregate(rows, fieldName, context) {
        const vals: number[] = [];
        this.collectValues(rows, fieldName, context, vals);
        context.setAggState({seq: ++markerSeq});
        if (!vals.length) return null;

        // Native sort with a numeric comparator sorts in place, where lodash `sortBy` would copy.
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
            if (!row.isLeaf && context.getAggState(row)) {
                this.collectValues(row.children, fieldName, context, vals);
            } else {
                const val = row.data[fieldName];
                if (val != null) vals.push(val);
            }
        }
    }
}
