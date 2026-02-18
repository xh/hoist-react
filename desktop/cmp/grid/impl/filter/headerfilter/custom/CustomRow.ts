/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {FieldFilterOperator} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {dateInput, numberInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {kebabCase} from 'lodash';

import {CustomRowModel} from './CustomRowModel';

/**
 * Row with operator and value combination for CustomTab.
 * @internal
 */
export const customRow = hoistCmp.factory({
    model: uses(CustomRowModel),

    render({model}) {
        const {options, op, hideInput} = model;
        return div({
            className: `xh-custom-filter-tab__row xh-custom-filter-tab__row--${kebabCase(op)}`,
            items: [
                vbox({
                    className: `xh-custom-filter-tab__row__body`,
                    items: [
                        div({
                            className: `xh-custom-filter-tab__row__top`,
                            item: select({
                                bind: 'op',
                                enableFilter: false,
                                hideSelectedOptionCheck: true,
                                width: '100%',
                                options,
                                optionRenderer: opt => operatorRenderer({opt})
                            })
                        }),
                        div({
                            omit: hideInput,
                            className: `xh-custom-filter-tab__row__bottom`,
                            item: inputField()
                        })
                    ]
                }),
                div({
                    className: `xh-custom-filter-tab__row__right`,
                    item: button({
                        icon: Icon.delete(),
                        intent: 'danger',
                        onClick: () => model.removeRow()
                    })
                })
            ]
        });
    }
});

//-------------------
// Implementation
//-------------------
const inputField = hoistCmp.factory<CustomRowModel>(({model}) => {
    const {fieldSpec, commitOnChange, op} = model,
        props = {
            bind: 'inputVal',
            enableClear: true,
            width: '100%',
            autoFocus: true,
            commitOnChange,
            ...fieldSpec.inputProps
        };

    if (fieldSpec.isNumericFieldType) {
        return numberInput({
            ...props,
            enableShorthandUnits: true
        });
    } else if (fieldSpec.isDateBasedFieldType) {
        return dateInput({
            ...props,
            valueType: fieldSpec.fieldType as 'localDate' | 'date'
        });
    } else if (fieldSpec.supportsSuggestions(op as FieldFilterOperator)) {
        return select({
            ...props,
            options: fieldSpec.values,
            enableCreate: !fieldSpec.forceSelection,
            enableMulti: true,
            hideDropdownIndicator: true,
            hideSelectedOptionCheck: true,
            enableClear: false
        });
    } else {
        return textInput(props);
    }
});

const operatorRenderer = hoistCmp.factory(({opt}) => {
    return div({
        className: 'xh-custom-filter-tab__operator-renderer',
        item: opt.label
    });
});
