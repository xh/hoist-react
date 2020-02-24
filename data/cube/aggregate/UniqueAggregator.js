/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {isEmpty} from 'lodash';
import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class UniqueAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        if (isEmpty(rows)) return null;

        const val = rows[0].data[fieldName];
        return rows.every(it => it.data[fieldName] === val) ? val : null;
    }

    replace(rows, currAgg, update) {
        const {newValue} = update;
        return rows.length === 1 || newValue === currAgg ? newValue : null;
    }
}