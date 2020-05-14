/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';
import {gatherLeaves} from '@xh/hoist/utils/js';

export class AverageStrictAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        rows = gatherLeaves(rows);
        let total = null;

        for (const row of rows) {
            const val = row.data[fieldName];
            if (val == null) return null;
            total += val;
        }

        return total / rows.length;
    }

    replace(rows, currAgg, update) {
        if (update.newValue == null) return null;
        return super.replace(rows, currAgg, update);
    }
}