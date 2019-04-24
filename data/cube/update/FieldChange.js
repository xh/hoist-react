/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

/**
 * Encapsulates the data associated with a value change of a field (XH.cube.Field) on a record (XH.cube.Record).
 *
 * The field member of this class is a reference to the field definition in the Cube.
 */
export class FieldChange {
    field = null;   // XH.cube.Field
    oldVal = null;
    newVal = null;

    constructor(field, oldVal, newVal) {
        this.field = field;
        this.oldVal = oldVal;
        this.newVal = newVal;
    }
}