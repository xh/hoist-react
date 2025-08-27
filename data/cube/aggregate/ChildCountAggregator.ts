/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

export class ChildCountAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        return rows.length;
    }

    override replace(rows, currAgg, update, context) {
        return currAgg;
    }
}
