/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {FieldFilterOperator, FieldFilterSpec} from '@xh/hoist/data';
import {ColumnHeaderFilterModel} from '@xh/hoist/desktop/cmp/grid/impl/filter/ColumnHeaderFilterModel';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {isArray, isNil} from 'lodash';
import {CustomTabModel} from './CustomTabModel';

type OperatorOptionValue = 'blank' | 'not blank' | FieldFilterOperator;

/**
 * @internal
 */
export class CustomRowModel extends HoistModel {
    override xhImpl = true;

    parentModel: CustomTabModel;
    headerFilterModel: ColumnHeaderFilterModel;

    @bindable op: OperatorOptionValue;
    @bindable inputVal: any;

    /** FieldFilter config output of this row. */
    @computed.struct
    get value(): FieldFilterSpec {
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

        if (isArray(value) && value.length === 1) {
            value = value[0];
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
        ] as {label: string; value: OperatorOptionValue}[];
    }

    get commitOnChange() {
        // Commit on change for the **inputs** should be the opposite to the GridFilterModel.
        // If the filter model commits on change, the inputs shouldn't as it would be too aggressive
        // while typing in values. Conversely, if the filter model doesn't, we prefer commitOnChange
        // for the inputs as it eagerly validates the "Apply" button.
        return !this.headerFilterModel.commitOnChange;
    }

    get hideInput() {
        return ['blank', 'not blank'].includes(this.op);
    }

    constructor(parentModel: CustomTabModel, op?: FieldFilterOperator, value?: any) {
        super();
        makeObservable(this);

        let newOp = op as OperatorOptionValue;
        if (isNil(value)) {
            if (op === '=') newOp = 'blank';
            if (op === '!=') newOp = 'not blank';
        }

        this.parentModel = parentModel;
        this.headerFilterModel = parentModel.headerFilterModel;
        this.op = newOp ?? this.fieldSpec.defaultOp;
        this.inputVal = value;
    }

    removeRow() {
        this.parentModel.removeRow(this);
    }

    getOperatorLabel(op: FieldFilterOperator) {
        switch (op) {
            case '=':
                return 'Equals';
            case '!=':
                return 'Not equals';
            case '>':
                return 'Greater than';
            case '>=':
                return 'Greater than or equals';
            case '<':
                return 'Less than';
            case '<=':
                return 'Less than or equals';
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
