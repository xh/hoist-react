/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {Aggregator} from './Aggregator';

export class SumStrictAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        let ret = null;
        for (const row of rows) {
            const val = row.data[fieldName];
            if (val == null) return null;
            ret += val;
        }
        return ret;
    }

    replace(rows, currAgg, update) {
        const {oldValue, newValue} = update;
        if (newValue == null) return null;
        if (currAgg == null) return super.replace(rows, currAgg, update);
        return currAgg - oldValue + newValue;
    }

}