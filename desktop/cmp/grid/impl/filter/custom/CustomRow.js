/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {hbox, div, filler} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/desktop/cmp/button';
import {dateInput, numberInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {kebabCase} from 'lodash';

import {CustomRowModel} from './CustomRowModel';

/**
 * Row with operator and value combination for CustomTab.
 * @private
 */
export const customRow = hoistCmp.factory({
    model: uses(CustomRowModel),
    render({model}) {
        const {options, op, hideInput} = model;
        return div({
            className: `xh-custom-filter-tab__row xh-custom-filter-tab__row--${kebabCase(op)}`,
            items: [
                hbox({
                    className: `xh-custom-filter-tab__row__top`,
                    items: [
                        select({
                            bind: 'op',
                            enableFilter: false,
                            hideSelectedOptionCheck: true,
                            options,
                            optionRenderer: (opt) => operatorRenderer({opt})
                        }),
                        filler(),
                        button({
                            icon: Icon.delete(),
                            intent: 'danger',
                            onClick: () => model.removeRow()
                        })
                    ]
                }),
                hbox({
                    omit: hideInput,
                    className: `xh-custom-filter-tab__row__bottom`,
                    item: inputField()
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
        const {fieldSpec, commitOnChange} = model,
            props = {
                bind: 'inputVal',
                enableClear: true,
                flex: 1,
                width: null,
                autoFocus: true,
                commitOnChange,
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