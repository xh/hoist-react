/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

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
        if (update.oldValue != null) currAgg -= update.oldValue;
        if (update.newValue != null) currAgg += update.newValue;
        return currAgg;
    }
}
