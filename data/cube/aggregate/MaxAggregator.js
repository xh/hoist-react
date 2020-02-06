/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

export class MaxAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        return rows.reduce((ret, it) => {
            const val = it[fieldName];
            if (val != null  && (ret == null || val > ret)) {
                ret = val;
            }
            return ret;
        }, null);
    }
}