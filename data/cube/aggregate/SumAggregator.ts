/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

/** Sums numeric values, skipping nulls. */
export class SumAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        let ret = null;
        for (const row of rows) {
            const val = row.data[fieldName];
            if (val != null) ret += val;
        }
        return ret;
    }

    override replace(rows, currAgg, update, context) {
        const {oldValue, newValue, field} = update;
        if (oldValue != null) currAgg -= oldValue;
        if (newValue != null) return currAgg + newValue;

        // A delta cannot tell "sums to zero" from "nothing left to sum".
        const {name} = field;
        for (const row of rows) {
            if (row.data[name] != null) return currAgg;
        }
        return null;
    }
}
