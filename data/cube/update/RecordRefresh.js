/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

//= require RecordUpdate.js

/**
 * Represents a change to all fields of an existing record.
 */
Ext.define('XH.cube.update.RecordRefresh', {
    extend: XH.cube.update.RecordUpdate,
    type: 'REFRESH',

    constructor(record) {
        this.callParent([record]);
    }
});