/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {CubeField} from '../CubeField';

/**
 * @internal
 */
export class RowUpdate {
    readonly field: CubeField;
    oldValue: any;
    newValue: any;

    constructor(field: CubeField, oldValue: any, newValue: any) {
        this.field = field;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}
