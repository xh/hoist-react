/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

//= require Aggregator.js

Ext.define('XH.cube.aggregate.Unique', {
    extend: XH.cube.aggregate.Aggregator,
    singleton: true,

    aggregate(records, fieldName) {
        if (Ext.isEmpty(records)) return null;

        const val = records[0].get(fieldName);
        return records.every(it => it.get(fieldName) == val) ? val : null;
    },

    replace(records, currAgg, update) {
        if (records.length == 1) return update.newVal;

        return update.newVal == currAgg ? currAgg : null;
    }
});