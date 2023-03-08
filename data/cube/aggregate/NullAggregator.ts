/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

export class NullAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        return null;
    }
}
