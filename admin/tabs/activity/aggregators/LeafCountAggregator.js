/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class LeafCountAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        let count = 0;

        for (const row of rows) {
            count += row.isLeaf ? 1 : row.data[fieldName];
        }

        return count;
    }

    replace(rows, currAgg, update) {
        return currAgg;
    }
}