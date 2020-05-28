/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class ChildCountAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        return rows.length;
    }

    replace(rows, currAgg, update) {
        return currAgg;
    }
}