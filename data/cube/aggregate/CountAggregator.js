/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class CountAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        let ret = 0;
        for (const row of rows) {
            const isAggRow = row.children;
            const val = row.data[fieldName];
            if (val != null) {
                isAggRow ? ret += val : ret++;
            }
        }
        return ret;
    }

    replace(rows, currAgg, update) {
        const {oldValue, newValue} = update,
            isAggRow = rows[0].children;
        if (oldValue != null) isAggRow ? currAgg -= oldValue : currAgg--;
        if (newValue != null) isAggRow ?  currAgg += oldValue : currAgg++;
        return currAgg;
    }
}