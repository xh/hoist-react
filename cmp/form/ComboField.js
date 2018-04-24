/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {isObject, find} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {Classes, menuItem, suggest} from 'hoist/kit/blueprint';

import {HoistField} from './HoistField';

/**
 * ComboBox Field
 *
 * @prop rest, see properties for HoistField
 *
 * @prop options, collection of form [{value: string, label: string}, ...] or [val, val, ...]
 * @prop placeholder, text to display when control is empty
 * @prop width, width of field, in pixels
 */
@hoistComponent()
export class ComboField extends HoistField {

    static defaultProps = {
        placeholder: 'Select'
    }

    delegateProps = ['className', 'disabled', 'placeholder'];

    render() {
        const {style, width, options, disabled} = this.props;

        const items = options.map(opt => {
            const isObj = isObject(opt);

            if (isObj && opt.value == null) {
                opt.value = HoistField.NULL_VALUE;
                return opt;
            }

            return opt == null ? HoistField.NULL_VALUE : opt;
        });

        const value = this.renderValue;

        return suggest({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: items,
            onItemSelect: this.onItemSelect,
            itemPredicate: (q, item, index) => {
                const isObj = isObject(item),
                    label = isObj ? item.label : item;
                return label.toLowerCase().includes(q.toLowerCase());
            },
            itemRenderer: (item, itemProps) => {
                let isObj = isObject(item) && item.value,
                    value = isObj ? item.value : item,
                    label = isObj ? item.label : item;
                if (item === HoistField.NULL_VALUE) label = '-';

                return menuItem({
                    key: value,
                    text: label,
                    onClick: itemProps.handleClick,
                    active: itemProps.modifiers.active
                });
            },
            inputValueRenderer: s => s,
            inputProps: {
                value: this.getDisplayValue(value, items),
                onChange: this.onChange,
                onKeyPress: this.onKeyPress,
                onBlur: this.onBlur,
                onFocus: this.onFocus,
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
        if (isObject(val)) val = val.value;
        this.noteValueChange(val);
        this.doCommit();
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') {
            this.doCommit();
        }
    }

    getDisplayValue(value, items) {
        const match = find(items, {value: value});

        if (match) return match.label;
        return (value == null || value === HoistField.NULL_VALUE) ? '' : value.toString();
    }
}
export const comboField = elemFactory(ComboField);