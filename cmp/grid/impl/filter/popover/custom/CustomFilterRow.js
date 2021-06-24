/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {dateInput, numberInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';

import {CustomFilterRowModel} from './CustomFilterRowModel';

export const customFilterRow = hoistCmp.factory({
    model: uses(CustomFilterRowModel),
    render({model}) {
        const {operatorOptions, type} = model;
        return hbox({
            className: 'xh-custom-filter-tab__row',
            items: [
                select({
                    bind: 'op',
                    enableFilter: false,
                    hideDropdownIndicator: true,
                    hideSelectedOptionCheck: true,
                    options: operatorOptions.map(value => ({label: operatorDisplay({op: value}), value})),
                    optionRenderer: (opt) => operatorDisplay({op: opt.value})
                }),
                inputField({type}),
                button({
                    icon: Icon.delete(),
                    intent: 'danger',
                    onClick: () => model.removeRow()
                })
            ]
        });
    }
});

//-------------------
// Implementation
//-------------------
const operatorDisplay = hoistCmp.factory(
    ({op}) => {
        let item = op;
        switch (op) {
            case '=':
                item = Icon.equals();
                break;
            case '!=':
                item = Icon.notEquals();
                break;
            case '>':
                item = Icon.greaterThan();
                break;
            case '>=':
                item = Icon.greaterThanEqual();
                break;
            case '<':
                item = Icon.lessThan();
                break;
            case '<=':
                item = Icon.lessThanEqual();
                break;
        }
        return hbox({className: 'xh-custom-filter-tab__operator-display', item});
    }
);

const inputField = hoistCmp.factory(
    ({type}) => {
        const props = {bind: 'inputVal', enableClear: true, flex: 1, width: null};
        let ret;
        switch (type) {
            case 'number':
            case 'int':
                ret = numberInput({...props, enableShorthandUnits: true});
                break;
            case 'localDate':
            case 'date':
                ret = dateInput({...props, valueType: type});
                break;
            default:
                ret = textInput(props);
        }
        return ret;
    }
);