/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

export class MaxAggregator extends Aggregator {

    aggregate(records, fieldName) {
        return records.reduce((ret, it) => {
            const val = it.get(fieldName);
            if (val != null  && (ret == null || val > ret)) {
                ret = val;
            }
            return ret;
        }, null);
    }
}