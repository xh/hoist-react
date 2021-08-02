/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

export class AverageStrictAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        let total = null,
            count = 0,
            containsNull = false;

        this.forEachLeaf(rows, row => {
            const val = row.data[fieldName];
            if (val == null) {
                containsNull = true;
                return false;
            }
            total += val;
            count ++;
        });

        return containsNull ? null : total / count;
    }

    replace(rows, currAgg, update) {
        if (update.newValue == null) return null;
        return super.replace(rows, currAgg, update);
    }
}
