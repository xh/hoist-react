/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {isNil} from 'lodash';

export class CustomFilterRowModel extends HoistModel {
    /** @member {CustomFilterTabModel} */
    parentModel;

    /** @member {ColumnHeaderFilterModel} */
    colFilterModel;

    @bindable op;
    @bindable inputVal;

    /**
     * @member {Object} - FieldFilter config output of this row
     */
    @computed.struct
    get value() {
        const {op, inputVal} = this,
            {field} = this.fieldSpec;

        if (isNil(inputVal)) return null;

        const value = this.colFilterModel.handleEmptyString(inputVal);
        return {field, op, value};
    }

    get fieldSpec() {
        return this.parentModel.fieldSpec;
    }

    constructor({
        parentModel,
        op = '!=',
        value
    }) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;
        this.colFilterModel = parentModel.parentModel;
        this.op = op;
        this.inputVal = value ? this.colFilterModel.parseValue(value, op) : null;
    }

    removeRow() {
        this.parentModel.removeRow(this);
    }
}