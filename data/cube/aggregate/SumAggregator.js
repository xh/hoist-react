/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class SumAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        return rows.reduce((ret, it) => {
            const val = it[fieldName];
            if (val != null) ret += val;
            return ret;
        }, null);
    }
}