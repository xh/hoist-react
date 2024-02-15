/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

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
        if (update.newValue >= currAgg) return update.newValue;
        if (update.oldValue >= currAgg) return this.aggregate(rows, update.field.name);

        return currAgg;
    }
}
