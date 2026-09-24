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
 * flag upward alongside the running total and count. A non-leaf child without state contributes
 * its published value as a single term if non-null - a null there marks a row that did not
 * aggregate the field at all, not a null leaf, so is skipped rather than nulling this average.
 * See {@link AverageAggregator} regarding floating-point error under incremental updates.
 */
export class AverageStrictAggregator extends Aggregator {
    override aggregate(rows, fieldName, context) {
        let total = 0,
            count = 0,
            hasNull = false;

        for (const row of rows) {
            const state = row.isLeaf ? null : context.getAggState(row);
            if (state) {
                total += state.total;
                count += state.count;
                if (state.hasNull) hasNull = true;
            } else {
                const val = row.data[fieldName];
                if (val != null) {
                    total += val;
                    count++;
                } else if (row.isLeaf) {
                    hasNull = true;
                }
            }
        }

        context.setAggState({total, count, hasNull});
        return hasNull || !count ? null : total / count;
    }

    override replace(rows, currAgg, update, context) {
        const state = context.getAggState(),
            {leafOldValue, leafNewValue, leafChange} = update;

        // `hasNull` is not a running total - a null arriving or clearing needs a re-scan, except
        // for a null leaf joining, which simply sets it.
        if (
            !state ||
            (leafOldValue == null && leafChange !== 'add') ||
            (leafNewValue == null && leafChange !== 'remove')
        ) {
            return super.replace(rows, currAgg, update, context);
        }

        if (leafChange === 'add') {
            state.total += leafNewValue;
            state.count++;
        } else if (leafChange === 'remove') {
            state.total -= leafOldValue;
            state.count--;
        } else {
            state.total += leafNewValue - leafOldValue;
        }

        const {total, count, hasNull} = state;
        return hasNull || !count ? null : total / count;
    }
}
