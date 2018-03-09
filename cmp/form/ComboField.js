/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


import {Component} from 'react';
import {isObject} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {Classes, menuItem, suggest} from 'hoist/kit/blueprint';

import {bindableField} from './BindableField';

/**
 * A ComboBox Field
 *
 * @prop value, string
 * @prop onChange, handler to fire when value changes
 * @prop model, model to bind to
 * @prop field, name of property in model to bind to
 * @prop disabled, is control disabled
 * @prop style
 * @prop className
 *
 * @prop options, collection of form [{value: string, label: string}, ...] or [val, val, ...]
 * @prop placeholder, text to display when control is empty
 * @prop width, width of field, in pixels
 */
@bindableField
@hoistComponent()
export class ComboField extends Component {

    static defaultProps = {
        placeholder: 'Select'
    }

    delegateProps = ['className', 'disabled', 'placeholder'];

    render() {
        const {style, width, options, disabled} = this.props;

        const value = this.readValue();

        return suggest({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: options,
            onItemSelect: this.onItemSelect,
            itemRenderer: (item, itemProps) => {
                let isObj = isObject(item) && item.value,
                    value = isObj ? item.value : item,
                    label = isObj ? item.label : item;
                if (label === null) label = '-';
                return menuItem({key: value, text: label, onClick: itemProps.handleClick});
            },
            inputValueRenderer: s => s,
            inputProps: {
                value: value === null ? '' : value.toString(),
                onChange: this.onChange,
                style: {...style, width},
                ...this.getDelegateProps()
            },
            disabled
        });
    }

    onChange = (ev) => {
        this.noteValueChange(ev.target.value);
    }

    onItemSelect = (val) => {
        this.noteValueChange(val);
    }
}
export const comboField = elemFactory(ComboField);