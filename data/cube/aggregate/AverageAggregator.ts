/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

/**
 * Averages numeric values across all leaf rows, skipping nulls.
 *
 * Composes from its direct children, using a running total and count held as aggregator state -
 * an average cannot be derived from its children's published averages alone. A child without
 * state (a leaf, or a row that did not aggregate the field - see
 * {@link AggregationContext.getAggState}) contributes its published value as a single term.
 *
 * Note that {@link replace} adjusts the running total by leaf deltas without ever re-deriving it
 * from leaf values, so floating-point error accumulates over the life of a connected view - as it
 * does for `SUM`. Its magnitude is that of a sum over the values seen, so is negligible for
 * typical measures, but an average expected to net to exactly zero may report a residue instead.
 */
export class AverageAggregator extends Aggregator {
    override aggregate(rows, fieldName, context) {
        let total = 0,
            count = 0;

        for (const row of rows) {
            const state = row.isLeaf ? null : context.getAggState(row);
            if (state) {
                total += state.total;
                count += state.count;
            } else {
                const val = row.data[fieldName];
                if (val != null) {
                    total += val;
                    count++;
                }
            }
        }

        context.setAggState({total, count});
        return count ? total / count : null;
    }

    override replace(rows, currAgg, update, context) {
        const state = context.getAggState();
        if (!state) return super.replace(rows, currAgg, update, context);

        const {leafOldValue, leafNewValue} = update;
        if (leafOldValue != null) {
            state.total -= leafOldValue;
            state.count--;
        }
        if (leafNewValue != null) {
            state.total += leafNewValue;
            state.count++;
        }

        const {total, count} = state;
        return count ? total / count : null;
    }
}
