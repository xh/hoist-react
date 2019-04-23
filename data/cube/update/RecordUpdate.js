/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

/**
 * Represents an update to an existing record.
 */
Ext.define('XH.cube.update.RecordUpdate', {
    record: null,
    type: null,

    constructor(record) {
        this.record = record;
    }
});