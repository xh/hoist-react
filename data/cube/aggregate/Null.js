/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

//= require Aggregator.js

Ext.define('XH.cube.aggregate.Null', {
    extend: XH.cube.aggregate.Aggregator,
    singleton: true,

    aggregate(records, fieldName) {
        return null;
    }
});