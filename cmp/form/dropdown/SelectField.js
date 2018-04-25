/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {hoistComponent, elemFactory} from 'hoist/core';
import {Classes, menuItem, select, button} from 'hoist/kit/blueprint';

import {BaseDropdownField} from './BaseDropdownField';

/**
 * A Select Field
 *
 * @prop rest, see properties for HoistField
 *
 * @prop options, collection of form [{value: object, label: string}, ...] or [val, val, ...]
 * @prop placeholder, text to display when control is empty
 * @prop width, width of field, in pixels
 */
@hoistComponent()
export class SelectField extends BaseDropdownField {

    delegateProps = ['className', 'disabled'];

    render() {
        let {style, width, options, placeholder, disabled} = this.props;

        options = this.normalizeOptions(options);

        const value = this.renderValue;

        return select({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: options,
            onItemSelect: this.onItemSelect,
            itemRenderer: (item, itemProps) => {
                return menuItem({
                    key: item.value,
                    text: item.label,
                    onClick: itemProps.handleClick,
                    active: itemProps.modifiers.active
                });
            },
            filterable: false,
            item: button({
                rightIcon: 'caret-down',
                text: this.getDisplayValue(value, options, placeholder),
                style: {...style, width},
                ...this.getDelegateProps()
            }),
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            disabled
        });
    }
}
export const selectField = elemFactory(SelectField);