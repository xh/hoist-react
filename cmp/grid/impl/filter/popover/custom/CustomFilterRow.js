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

// Todo: Add these icons to main library?
import {library} from '@fortawesome/fontawesome-svg-core';
import {faEquals, faGreaterThan, faGreaterThanEqual, faLessThan, faLessThanEqual, faNotEqual} from '@fortawesome/pro-regular-svg-icons';
library.add(faGreaterThanEqual, faGreaterThan, faLessThanEqual, faLessThan, faEquals, faNotEqual);

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
                item = Icon.icon({iconName: 'equals'});
                break;
            case '!=':
                item = Icon.icon({iconName: 'not-equal'});
                break;
            case '>':
                item = Icon.icon({iconName: 'greater-than'});
                break;
            case '>=':
                item = Icon.icon({iconName: 'greater-than-equal'});
                break;
            case '<':
                item = Icon.icon({iconName: 'less-than'});
                break;
            case '<=':
                item = Icon.icon({iconName: 'less-than-equal'});
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