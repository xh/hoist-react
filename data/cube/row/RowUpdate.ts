/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {Field} from '../../Field';

/**
 * @internal
 */
export class RowUpdate {

    readonly field: Field;
    readonly oldValue: any;
    readonly newValue: any;

    constructor(field, oldValue, newValue) {
        this.field = field;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}
