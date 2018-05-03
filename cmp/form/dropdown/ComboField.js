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
 * @prop requireSelection, whether to force a choice from given menu options
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
        // Can leave this alone?
        // We have to allow the interval val to change
        // How will this affect onChange callback handling?
        // looks like an onChange will get fired on every key stroke which seems wrong.
        // If the inputted value is not an acceptable external value why would we call the callback?
        this.noteValueChange(ev.target.value);
    }

    onKeyPress = (ev) => {
        const props = this.props,
            {options, requireSelection} = this.props,
            val = this.internalValue;

        const gate = requireSelection ? options.some((it) => it == val || it.value == val) : true;
        if (ev.key === 'Enter' && gate) {
            debugger;
            this.doCommit(); // here
        }
    }

    onBlur = () => {
        const props = this.props,
            {options, requireSelection} = this.props,
            val = this.internalValue;

        const gate = requireSelection ? options.some((it) => it == val || it.value == val) : true;
        if (gate) {
            this.doCommit();
        }

        this.setHasFocus(false);
    }
}
export const comboField = elemFactory(ComboField);