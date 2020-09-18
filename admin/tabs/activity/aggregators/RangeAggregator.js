/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {min, max} from 'lodash';
import {Aggregator} from '@xh/hoist/data/cube/aggregate/Aggregator';

export class RangeAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        const minVals = rows.map(row => row.isLeaf ? row.data[fieldName] : row.data[fieldName].min),
            maxVals = rows.map(row => row.isLeaf ? row.data[fieldName] : row.data[fieldName].max);

        return {min: min(minVals), max: max(maxVals)};
    }

    replace(rows, currAgg, update) {
        const {oldValue, newValue} = update;

        if ((oldValue == currAgg.min || oldValue == currAgg.max)) {
            return super.replace(rows, currAgg, update);
        }

        if (newValue == null) return currAgg;

        const valFromLeaf = rows[0].isLeaf,
            minToCheck = valFromLeaf ? newValue : newValue.min,
            maxToCheck = valFromLeaf ? newValue : newValue.max,
            newAgg = {...currAgg};

        if (minToCheck < currAgg.min) newAgg.min = minToCheck;
        if (maxToCheck > currAgg.max) newAgg.max = maxToCheck;

        return newAgg;
    }

}