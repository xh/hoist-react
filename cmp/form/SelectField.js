/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {isObject} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {Classes, menuItem, select, button} from 'hoist/kit/blueprint';

import {bindableField} from './BindableField';

/**
 * A Select Field
 *
 * @prop value, object
 * @prop onChange, handler to fire when value changes
 * @prop model, model to bind to
 * @prop field, name of property in model to bind to
 * @prop disabled, is control disabled
 * @prop style
 * @prop className
 *
 * @prop options, collection of form [{value: object, label: string}, ...] or [val, val, ...]
 * @prop placeholder, text to display when control is empty
 */
@bindableField
@hoistComponent()
export class SelectField extends Component {

    static defaultProps = {
        placeholder: 'Select'
    }

    delegateProps = ['className', 'style', 'disabled'];

    render() {
        const {style, width, options, placeholder, disabled} = this.props;

        const value = this.readValue();

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
            disabled
        });
    }

    onItemSelect = (val) => {
        this.noteValueChange(val);
    }
}
export const selectField = elemFactory(SelectField);