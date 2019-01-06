/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, bindable} from '@xh/hoist/mobx';
import {BaseFieldModel} from './BaseFieldModel'

/**
 *
 * A data field in a Form.
 */
@HoistModel
export class FieldModel  extends BaseFieldModel {

    /** @member {boolean}.  True to disable input on this field.*/
    @observable disabled;
    /** @member {boolean}.  True to make this field read-only.*/
    @observable readonly;

    constructor({
        disabled = false,
        readonly = false,
        ...rest
    }) {
        super(rest);
        this.disabled = disabled;
        this.readonly = readonly;
    }
}
