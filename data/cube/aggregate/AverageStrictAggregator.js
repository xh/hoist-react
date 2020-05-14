/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class AverageStrictAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        let total = null;

        this.forEachLeaf(rows, row => {
            const val = row.data[fieldName];
            if (val == null) return null;
            total += val;
        });

        return total / rows.length;
    }

    replace(rows, currAgg, update) {
        if (update.newValue == null) return null;
        return super.replace(rows, currAgg, update);
    }
}