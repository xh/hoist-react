/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {hbox, div} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {dateInput, numberInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {kebabCase} from 'lodash';

import {CustomFilterRowModel} from './CustomFilterRowModel';

export const customFilterRow = hoistCmp.factory({
    model: uses(CustomFilterRowModel),
    render({model}) {
        const {options, op, hideInput} = model;
        return hbox({
            className: `xh-custom-filter-tab__row xh-custom-filter-tab__row--${kebabCase(op)}`,
            items: [
                select({
                    bind: 'op',
                    enableFilter: false,
                    hideDropdownIndicator: true,
                    hideSelectedOptionCheck: true,
                    menuWidth: 110,
                    options,
                    optionRenderer: (opt) => operatorRenderer({opt})
                }),
                inputField({omit: hideInput}),
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
const inputField = hoistCmp.factory(
    ({model}) => {
        const {fieldSpec} = model,
            props = {
                bind: 'inputVal',
                commitOnChange: true,
                enableClear: true,
                flex: 1,
                width: null,
                ...fieldSpec.inputProps
            };

        if (fieldSpec.isNumericFieldType) {
            return numberInput({...props, enableShorthandUnits: true});
        } else if (fieldSpec.isDateBasedFieldType) {
            return dateInput({...props, valueType: fieldSpec.fieldType});
        }

        return textInput(props);
    }
);

const operatorRenderer = hoistCmp.factory(
    ({opt}) => {
        return div({
            className: 'xh-custom-filter-tab__operator-renderer',
            item: opt.label
        });
    }
);