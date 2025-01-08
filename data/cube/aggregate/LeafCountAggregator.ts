/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

export class LeafCountAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        let count = 0;
        for (const row of rows) {
            count += row.isLeaf ? 1 : row.data[fieldName];
        }
        return count;
    }

    override replace(rows, currAgg, update, context) {
        return currAgg;
    }
}
