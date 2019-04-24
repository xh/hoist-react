/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {RecordUpdate} from './RecordUpdate';

/**
 * Represents a change to an existing record.
 */
export class RecordChange extends RecordUpdate {
    type = 'CHANGE';
    fieldChanges = null;  // Collection of FieldChanges.

    constructor(record, fieldChanges) {
        super(record);
        this.fieldChanges = fieldChanges;
    }
}