/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

export class SingleAggregator extends Aggregator {

    aggregate(records, fieldName) {
        return records.length == 1 ? records.get(fieldName) : null;
    }
}