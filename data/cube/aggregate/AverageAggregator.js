/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';
import {gatherLeaves} from '@xh/hoist/utils/js';

export class AverageAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        rows = gatherLeaves(rows);
        let total = null,
            count = 0;

        this.forEachLeaf(rows, leaf => {
            const val = leaf.data[fieldName];
            if (val != null) {
                total += val;
                count++;
            }
        });

        return total != null ? total / count : null;
    }
}