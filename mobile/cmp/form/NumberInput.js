/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {input} from '@xh/hoist/kit/onsen';
import {fmtNumber} from '@xh/hoist/format';

import {HoistInput} from '@xh/hoist/cmp/form';

/**
 * A Number Input
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class NumberInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.number,

        /** Text to display when control is empty */
        placeholder: PT.string,
        /** minimum value */
        min: PT.number,
        /** maximum value */
        max: PT.number,
        /** Number of decimal places to allow on field's value, defaults to 4 */
        precision: PT.number,
        /** Allow/automatically fill in trailing zeros in accord with precision, defaults to false */
        zeroPad: PT.bool,
        /** Set to true for advanced input evaluation, defaults to false.
         Inputs suffixed with k, m, or b will be calculated as thousands, millions, or billions respectively */
        enableShorthandUnits: PT.bool,
        /** Whether to display large values with commas */
        displayWithCommas: PT.bool,
        /** Onsen modifier string */
        modifier: PT.string,
        /** Function which receives keypress event */
        onKeyPress: PT.func,
        /** Whether text in field is selected when field receives focus */
        selectOnFocus: PT.bool
    };

    static shorthandValidator = /((\.\d+)|(\d+(\.\d+)?))(k|m|b)\b/gi;

    baseClassName = 'xh-number-input';

    render() {
        const {props, renderValue, hasFocus} = this,
            formattedValue = hasFocus ? renderValue : this.formatValue(renderValue);

        return input({
            className: this.getClassName(),
            value: formattedValue || '',
            onChange: this.onChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {width: props.width, ...props.style},
            spellCheck: false,
            type: props.enableShorthandUnits ? 'text' : 'number',
            disabled: props.disabled,
            min: props.min,
            max: props.max,
            placeholder: props.placeholder,
            modifier: props.modifier
        });
    }

    formatValue(value) {
        if (value == null) return '';
        const {props} = this,
            precision = props.precision != null ? props.precision : 4,
            zeroPad = !!props.zeroPad,
            formattedVal = fmtNumber(value, {precision, zeroPad});

        return props.displayWithCommas ? formattedVal : formattedVal.replace(/,/g, '');
    }

    parseValue(value) {
        if (!value) return value;
        value = value.toString();
        value = value.replace(/,/g, '');

        if (NumberInput.shorthandValidator.test(value)) {
            const num = +value.substring(0, value.length - 1),
                lastChar = value.charAt(value.length - 1).toLowerCase();

            switch (lastChar) {
                case 'k':
                    return num * 1000;
                case 'm':
                    return num * 1000000;
                case 'b':
                    return num * 1000000000;
                default:
                    return null;
            }
        }

        value = parseFloat(value);
        return isNaN(value) ? null : value;
    }

    onFocus = (ev) => {
        if (this.props.selectOnFocus && ev.target && ev.target.select) {
            ev.target.select();
        }
        this.noteFocused();
    }

    onChange = (ev) => {
        const v = this.parseValue(ev.target.value);
        this.noteValueChange(v);
    };

    onKeyPress = (ev) => {
        const {onKeyPress} = this.props;

        if (ev.key === 'Enter') this.doCommit();
        if (onKeyPress) onKeyPress(ev);
    };
}
export const numberInput = elemFactory(NumberInput);