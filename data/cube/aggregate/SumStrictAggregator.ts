/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Aggregator} from './Aggregator';

/** Sums numeric values, returning null if any value is null. */
export class SumStrictAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        let ret = null;
        for (const row of rows) {
            const val = row.data[fieldName];
            if (val == null) return null;
            ret += val;
        }
        return ret;
    }

    override replace(rows, currAgg, update, context) {
        const {oldValue, newValue} = update;
        if (newValue == null) return null;
        if (currAgg == null) return super.replace(rows, currAgg, update, context);
        return currAgg - oldValue + newValue;
    }

    override add(rows, currAgg, value, context) {
        if (value == null) return null;
        if (currAgg == null) return super.add(rows, currAgg, value, context);
        return currAgg + value;
    }

    // A null aggregate may be the leaving leaf's own null clearing - re-aggregate to find out.
    override remove(rows, currAgg, value, context) {
        if (currAgg == null) return super.remove(rows, currAgg, value, context);
        return currAgg - value;
    }
}
