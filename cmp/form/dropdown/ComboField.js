/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {isObject} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {Classes, suggest} from 'hoist/kit/blueprint';

import {BaseDropdownField} from './BaseDropdownField';

/**
 * ComboBox Field - A field with type ahead suggest and menu select
 *
 * @see HoistField for properties additional to those documented below.
 */
@hoistComponent()
export class ComboField extends BaseDropdownField {

    static propTypes = {
        /** Collection of form [{value: string, label: string}, ...] or [val, val, ...] */
        options: PT.arrayOf(PT.oneOfType([PT.object, PT.string])).isRequired,
        /** Optional custom optionRenderer, a function that receives (option, optionProps) */
        optionRenderer: PT.func
    };

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
            itemRenderer: this.getOptionRenderer(),
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
        const {options, requireSelection} = this.props,
            val = this.internalValue;

        if (ev.key === 'Enter') {
            if (requireSelection) {
                this.matchInputToOption(options, val);
            }
            this.doCommit();
        }
    }

    onBlur = () => {
        const {options, requireSelection} = this.props,
            val = this.internalValue;

        if (requireSelection) {
            this.matchInputToOption(options, val);
        }

        this.doCommit();
        this.setHasFocus(false);
    }

    matchInputToOption(options, val) {
        options = this.normalizeOptions(options);

        // if value does not match an available option, reset to previous value
        const match = find(options, (it) => it.label.toLowerCase() == val.toLowerCase()) || this.externalValue,
            newValue = isObject(match) ? match.value : match;

        // doCommit does the toInternal/toExternal conversions for us but this is perhaps clearer and safer if that should change
        this.setInternalValue(this.toInternal(newValue));
    }


}
export const comboField = elemFactory(ComboField);