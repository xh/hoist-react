/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {min, max, isObject, flatten} from 'lodash';
import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class RangeAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        const values = flatten(rows.map(row => {
                const val = row.data[fieldName];
                return isObject(val) ? [val.min, val.max] : val;
            })),
            minVal = min(values),
            maxVal = max(values);

        return {min: minVal, max: maxVal};
    }

    // replace(rows, currAgg, update) {
    //     const {oldValue, newValue} = update;
    //
    //     if (newValue == null && (oldValue == currAgg.min || oldValue == currAgg.max)) {
    //         return super.replace(rows, currAgg, update);
    //     }
    //
    //     if (newValue < currAgg.min) currAgg.min = newValue;
    //     if (newValue > currAgg.max) currAgg.max = newValue;
    //     return currAgg;
    // }
}