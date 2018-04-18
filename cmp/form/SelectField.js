/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isObject} from 'lodash';
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

        const value = this.renderValue;

        return select({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: options,
            onItemSelect: this.onItemSelect,
            itemRenderer: (item, itemProps) => {
                let isObj = isObject(item) && item.value,
                    value = isObj ? item.value : item,
                    label = isObj ? item.label : item;
                if (label === null) label = '-';
                return menuItem({key: value, text: label.toString(), onClick: itemProps.handleClick});
            },
            filterable: false,
            item: button({
                rightIcon: 'caret-down',
                text: value === null ? placeholder : value.toString(),
                style: {...style, width},
                ...this.getDelegateProps()
            }),
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            disabled
        });
    }

    onItemSelect = (val) => {
        this.noteValueChange(val);
        this.doCommit();
    }
}
export const selectField = elemFactory(SelectField);