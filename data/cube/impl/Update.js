/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */


/**
 * @private
 */
export class Update {

    record = null;
    oldRecord = null;
    fieldUpdates = null;

    constructor({record, oldRecord, fieldUpdates}) {
        this.record = record;
        this.oldRecord = oldRecord;
        this.fieldUpdates = fieldUpdates;
    }
}