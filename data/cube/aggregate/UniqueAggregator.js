/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';
import {isEmpty} from 'lodash';

export class UniqueAggregator extends Aggregator {

    aggregate(records, fieldName) {
        if (isEmpty(records)) return null;

        const val = records[0].get(fieldName);
        return records.every(it => it.get(fieldName) == val) ? val : null;
    }
}
