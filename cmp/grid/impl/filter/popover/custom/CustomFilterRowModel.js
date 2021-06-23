/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {FieldFilter} from '@xh/hoist/data';
import {isNil} from 'lodash';

export class CustomFilterRowModel extends HoistModel {
    /** @member {CustomFilterTabModel} */
    parentModel;

    @bindable op;
    @bindable inputVal;

    /**
     * @member {Object} - FieldFilter config output of this row
     */
    @computed.struct
    get value() {
        const {colId: field, op, inputVal: value} = this;
        if (isNil(value)) return null;
        return {field, op, value};
    }

    get colId() {
        return this.parentModel.colId;
    }

    get type() {
        return this.parentModel.type;
    }

    get operatorOptions() {
        const {type} = this;
        if (['number', 'int', 'localDate', 'date'].includes(type)) {
            // Comparison operators [<,<=,>,>=] supported
            return FieldFilter.OPERATORS;
        } else {
            // Comparison operators [<,<=,>,>=] not supported
            return FieldFilter.ARRAY_OPERATORS;
        }
    }

    constructor({
        parentModel,
        op = '!=',
        value
    }) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;
        this.op = op;
        this.inputVal = value;
    }

    removeRow() {
        this.parentModel.removeRow(this);
    }
}