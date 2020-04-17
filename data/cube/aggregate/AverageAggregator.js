/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class AverageAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        let total = null;
        for (const row of rows) {
            const val = row.data[fieldName];
            if (val != null) total += val;
        }
        return total / rows.length;
    }

    replace(rows, currAgg, update) {
        const {oldValue, newValue} = update;
        let total = currAgg * rows.length; // TODO: Assumes the same number of rows, is this ok?

        if (oldValue != null) total -= oldValue;
        if (newValue != null) total += newValue;

        return total / rows.length;
    }
}