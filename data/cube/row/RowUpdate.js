/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

/**
 * @private
 */
export class RowUpdate {

    constructor(field, oldValue, newValue) {
        this.field = field;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}
