/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {isNil} from 'lodash';

/**
 * @private
 */
export class CustomRowModel extends HoistModel {
    /** @member {CustomTabModel} */
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
        const {field} = this.fieldSpec;

        let op = this.op,
            value = this.inputVal;

        if (op === 'blank') {
            op = '=';
            value = null;
        } else if (op === 'not blank') {
            op = '!=';
            value = null;
        } else if (isNil(value)) {
            return null;
        }

        return {field, op, value};
    }

    get fieldSpec() {
        return this.parentModel.fieldSpec;
    }

    get options() {
        return [
            ...this.fieldSpec.ops.map(value => {
                const label = this.getOperatorLabel(value);
                return {label, value};
            }),
            {label: 'Is blank', value: 'blank'},
            {label: 'Is not blank', value: 'not blank'}
        ];
    }

    get commitOnChange() {
        // Commit on change for the **inputs** should be the opposite to the GridFilterModel.
        // If the filter model commits on change, the inputs shouldn't as it would be too aggressive
        // while typing in values. Conversely, if the filter model doesn't, we prefer commitOnChange
        // for the inputs as it eagerly validates the "Apply" button.
        return !this.parentModel.parentModel.commitOnChange;
    }

    get hideInput() {
        return ['blank', 'not blank'].includes(this.op);
    }

    constructor({
        parentModel,
        op,
        value
    }) {
        super();
        makeObservable(this);

        if (isNil(value)) {
            if (op === '=') op = 'blank';
            if (op === '!=') op = 'not blank';
        }

        this.parentModel = parentModel;
        this.colFilterModel = parentModel.parentModel;
        this.op = op ?? this.fieldSpec.defaultOp;
        this.inputVal = value;
    }

    removeRow() {
        this.parentModel.removeRow(this);
    }

    getOperatorLabel(op) {
        switch (op) {
            case '=':
                return 'Equal';
            case '!=':
                return 'Not equal';
            case '>':
                return 'Greater than';
            case '>=':
                return 'Greater than or equal';
            case '<':
                return 'Less than';
            case '<=':
                return 'Less than or equal';
            case 'like':
                return 'Like';
            case 'not like':
                return 'Not like';
            case 'begins':
                return 'Begins with';
            case 'ends':
                return 'Ends with';
        }
        return op;
    }
}