/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {vbox, div} from '@xh/hoist/cmp/layout';
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

    /** @param {CustomRowModel} model */
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
                                optionRenderer: (opt) => operatorRenderer({opt})
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
const inputField = hoistCmp.factory(
    ({model}) => {
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
                valueType: fieldSpec.fieldType
            });
        } else if (fieldSpec.supportsSuggestions(op)) {
            return select({
                ...props,
                options: fieldSpec.values,
                enableCreate: !fieldSpec.forceSelection,
                enableMulti: true,
                hideDropdownIndicator: true,
                hideSelectedOptionCheck: true
            });
        } else {
            return textInput(props);
        }
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
