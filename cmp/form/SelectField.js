/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isObject, find} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {Classes, menuItem, select, button} from 'hoist/kit/blueprint';

import {HoistField} from './HoistField';

/**
 * A Select Field
 *
 * @prop rest, see properties for HoistField
 *
 * @prop options, collection of form [{value: object, label: string}, ...] or [val, val, ...]
 * @prop placeholder, text to display when control is empty
 */
@hoistComponent()
export class SelectField extends HoistField {

    static defaultProps = {
        placeholder: 'Select'
    }

    delegateProps = ['className', 'style', 'disabled'];

    render() {
        const {style, width, options, placeholder, disabled} = this.props;

        const items = options.map(opt => {
            const isObj = isObject(opt);

            if (isObj && opt.value == null) {
                opt.value = HoistField.NULL_VALUE;
                return opt;
            }

            return opt == null ? HoistField.NULL_VALUE : opt;
        });

        const value = this.renderValue;

        return select({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: items,
            onItemSelect: this.onItemSelect,
            itemRenderer: (item, itemProps) => {
                let isObj = isObject(item),
                    value = isObj ? item.value : item,
                    label = isObj ? item.label : item;
                if (item === HoistField.NULL_VALUE) label = '-';
                return menuItem({
                    key: value,
                    text: label.toString(),
                    onClick: itemProps.handleClick,
                    active: itemProps.modifiers.active
                });
            },
            filterable: false,
            item: button({
                rightIcon: 'caret-down',
                text: this.getDisplayValue(value, items, placeholder),
                style: {...style, width},
                ...this.getDelegateProps()
            }),
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            disabled
        });
    }

    onItemSelect = (val) => {
        if (isObject(val)) val = val.value;
        this.noteValueChange(val);
        this.doCommit();
    }

    getDisplayValue(value, items, placeholder) {
        const match = find(items, {value: value});

        if (match) return match.label;
        return value == null || value === HoistField.NULL_VALUE ? placeholder : value.toString();
    }
}
export const selectField = elemFactory(SelectField);