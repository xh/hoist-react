/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

//= require RecordUpdate.js

/**
 * Represents an addition of a record.
 */
Ext.define('XH.cube.update.RecordAdd', {
    extend: XH.cube.update.RecordUpdate,
    type: 'ADD',

    constructor(record) {
        this.callParent([record]);
    }
});