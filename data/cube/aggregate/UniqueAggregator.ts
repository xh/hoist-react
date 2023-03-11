/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';
import {isEmpty} from 'lodash';

export class UniqueAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        if (isEmpty(rows)) return null;

        const val = rows[0].data[fieldName];
        return rows.every(it => it.data[fieldName] === val) ? val : null;
    }

    override replace(rows, currAgg, update, context) {
        const {newValue} = update;
        return rows.length === 1 || newValue === currAgg ? newValue : null;
    }
}
