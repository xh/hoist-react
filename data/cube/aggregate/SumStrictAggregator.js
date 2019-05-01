/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Aggregator} from './Aggregator';

export class SumStrictAggregator extends Aggregator {

    aggregate(records, fieldName) {
        if (!records.length || records.some(it => it.get(fieldName) == null)) return null;

        return records.reduce((ret, it) => {
            ret += it.get(fieldName);
            return ret;
        }, 0);
    }

    replace(records, currAgg, update) {
        const {oldVal, newVal} = update;
        if (currAgg == null || oldVal == null || newVal == null) {
            return super.replace(records, currAgg, update); // TODO: what was callParent doing here?
        }
        return currAgg - oldVal + newVal;
    }
}