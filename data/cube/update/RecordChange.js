/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {RecordUpdate} from '@xh/hoist/data/cube/update/RecordUpdate';

/**
 * Represents a change to an existing record.
 */
export class RecordChange extends RecordUpdate {
    _type = 'CHANGE';
    _fieldChanges = null;  // Collection of FieldChanges.

    constructor(record, fieldChanges) {
        super(record);
        this.fieldChanges = fieldChanges;
    }
}