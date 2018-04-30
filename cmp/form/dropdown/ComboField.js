/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {hoistComponent, elemFactory} from 'hoist/core';
import {Classes, suggest} from 'hoist/kit/blueprint';

import {BaseDropdownField} from './BaseDropdownField';

/**
 * ComboBox Field
 *
 * @prop rest, see properties for HoistField
 *
 * @prop options, collection of form [{value: string, label: string}, ...] or [val, val, ...]
 * @prop placeholder, text to display when control is empty
 * @prop itemRenderer, optional custom itemRenderer, a function that receives (item, itemProps)
 */
@hoistComponent()
export class ComboField extends BaseDropdownField {

    delegateProps = ['className', 'disabled', 'placeholder'];

    render() {
        let {style, width, options, disabled} = this.props;

        options = this.normalizeOptions(options);
        const value = this.renderValue;

        return suggest({
            popoverProps: {popoverClassName: Classes.MINIMAL},
            $items: options,
            onItemSelect: this.onItemSelect,
            itemPredicate: (q, item) => {
                return item.label.toLowerCase().includes(q.toLowerCase());
            },
            itemRenderer: this.getItemRenderer(),
            inputValueRenderer: s => s,
            inputProps: {
                value: this.getDisplayValue(value, options, ''),
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

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') {
            this.doCommit();
        }
    }
}
export const comboField = elemFactory(ComboField);