/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

/** Returns the maximum value across rows, skipping nulls. */
export class MaxAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        return rows.reduce((ret, it) => {
            const val = it.data[fieldName];
            if (val != null && (ret == null || val > ret)) {
                ret = val;
            }
            return ret;
        }, null);
    }

    override replace(rows, currAgg, update, context) {
        const {oldValue, newValue, field} = update;

        // Relational comparisons below coerce null to 0 - resolve nulls first.
        if (currAgg == null) return newValue;
        if (newValue == null) {
            return oldValue != null && oldValue >= currAgg
                ? this.aggregate(rows, field.name)
                : currAgg;
        }

        if (newValue >= currAgg) return newValue;
        if (oldValue >= currAgg) return this.aggregate(rows, field.name);

        return currAgg;
    }
}
