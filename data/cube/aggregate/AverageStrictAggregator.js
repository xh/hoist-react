/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class AverageStrictAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        let strict = true,
            total = null,
            count = 0;

        this.forEachLeaf(rows, row => {
            const val = row.data[fieldName];
            if (val == null) {
                strict = false;
                return;
            }
            total += val;
            count++;
        });

        return strict ? total / count : null;
    }

    replace(rows, currAgg, update) {
        if (update.newValue == null) return null;
        return super.replace(rows, currAgg, update);
    }
}