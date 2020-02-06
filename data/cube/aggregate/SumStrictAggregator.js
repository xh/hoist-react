/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {Aggregator} from './Aggregator';

export class SumStrictAggregator extends Aggregator {

    aggregate(rows, fieldName) {
        if (!rows.length || rows.some(it => it[fieldName] == null)) return null;

        return rows.reduce((ret, it) => {
            ret += it[fieldName];
            return ret;
        }, 0);
    }
}