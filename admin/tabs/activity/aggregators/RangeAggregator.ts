/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {Aggregator} from '@xh/hoist/data';
import {min, max} from 'lodash';

export class RangeAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        const minVals = rows.map(row => row.data[fieldName].min),
            maxVals = rows.map(row => row.data[fieldName].max);

        return {min: min(minVals), max: max(maxVals)};
    }

    override replace(rows, currAgg, update, context) {
        const {oldValue, newValue} = update;

        if (oldValue == currAgg.min || oldValue == currAgg.max) {
            return super.replace(rows, currAgg, update, context);
        }

        if (newValue == null) return currAgg;

        const minToCheck = newValue.min,
            maxToCheck = newValue.max,
            newAgg = {...currAgg};

        if (minToCheck < currAgg.min) newAgg.min = minToCheck;
        if (maxToCheck > currAgg.max) newAgg.max = maxToCheck;

        return newAgg;
    }
}
