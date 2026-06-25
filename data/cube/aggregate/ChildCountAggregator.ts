/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

/** Returns the count of direct child rows. */
export class ChildCountAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        return rows.length;
    }

    override replace(rows, currAgg, update, context) {
        return currAgg;
    }
}
