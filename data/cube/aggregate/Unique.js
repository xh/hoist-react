/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isEmpty} from 'lodash';

import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class Unique extends Aggregator {

    aggregate(records, fieldName) {
        if (isEmpty(records)) return null;

        const val = records[0].get(fieldName);
        return records.every(it => it.get(fieldName) == val) ? val : null;
    }

    replace(records, currAgg, update) {
        if (records.length == 1) return update.newVal;

        return update.newVal == currAgg ? currAgg : null;
    }
}