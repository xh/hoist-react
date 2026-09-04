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
 * an average cannot be derived from its children's published averages alone.
 */
export class AverageAggregator extends Aggregator {
    override aggregate(rows, fieldName, context) {
        let total = 0,
            count = 0;

        for (const row of rows) {
            if (row.isLeaf) {
                const val = row.data[fieldName];
                if (val != null) {
                    total += val;
                    count++;
                }
            } else {
                const state = context.getAggState(row);
                if (state) {
                    total += state.total;
                    count += state.count;
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
