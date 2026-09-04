/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

/**
 * Averages numeric values, returning null if any leaf value is null.
 *
 * Composes from its direct children as {@link AverageAggregator} does, carrying the null-seen
 * flag upward alongside the running total and count.
 */
export class AverageStrictAggregator extends Aggregator {
    override aggregate(rows, fieldName, context) {
        let total = 0,
            count = 0,
            hasNull = false;

        for (const row of rows) {
            if (row.isLeaf) {
                const val = row.data[fieldName];
                if (val == null) {
                    hasNull = true;
                } else {
                    total += val;
                    count++;
                }
            } else {
                const state = context.getAggState(row);
                if (state) {
                    total += state.total;
                    count += state.count;
                    if (state.hasNull) hasNull = true;
                }
            }
        }

        context.setAggState({total, count, hasNull});
        return hasNull || !count ? null : total / count;
    }

    override replace(rows, currAgg, update, context) {
        const state = context.getAggState(),
            {leafOldValue, leafNewValue} = update;

        // `hasNull` is not a running total - a null arriving or clearing needs a re-scan.
        if (!state || leafOldValue == null || leafNewValue == null) {
            return super.replace(rows, currAgg, update, context);
        }

        state.total += leafNewValue - leafOldValue;

        const {total, count, hasNull} = state;
        return hasNull || !count ? null : total / count;
    }
}
