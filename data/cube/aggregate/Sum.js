/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

//= require Aggregator.js

Ext.define('XH.cube.aggregate.Sum', {
    extend: XH.cube.aggregate.Aggregator,
    singleton: true,

    aggregate(records, fieldName) {
        return records.reduce((ret, it) => {
            const val = it.get(fieldName);
            if (val != null) ret += val;
            return ret;
        }, null);
    },

    replace(records, currAgg, update) {
        if (update.oldVal != null) currAgg -= update.oldVal;
        if (update.newVal != null) currAgg += update.newVal;
        return currAgg;
    }
});