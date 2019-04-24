/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

/**
 * Encapsulates the data associated with a value change of a field (Field) on a record (Record).
 *
 * The field member of this class is a reference to the field definition in the Cube.
 */
export class FieldChange {
    field = null;
    oldVal = null;
    newVal = null;

    constructor(field, oldVal, newVal) {
        this.field = field;
        this.oldVal = oldVal;
        this.newVal = newVal;
    }
}