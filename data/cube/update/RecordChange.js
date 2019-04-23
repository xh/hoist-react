/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

//= require RecordUpdate.js

/**
 * Represents a change to an existing record.
 */
Ext.define('XH.cube.update.RecordChange', {
    extend: XH.cube.update.RecordUpdate,
    type: 'CHANGE',
    fieldChanges: null,  // Collection of FieldChanges.

    constructor(record, fieldChanges) {
        this.fieldChanges = fieldChanges;
        this.callParent([record]);
    }
});