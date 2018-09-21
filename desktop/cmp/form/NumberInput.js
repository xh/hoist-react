/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {numericInput} from '@xh/hoist/kit/blueprint';
import {fmtNumber} from '@xh/hoist/format';
import {HoistInput} from '@xh/hoist/cmp/form';
import {withDefault} from '@xh/hoist/utils/js';


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

        /** commit on every key stroke, defaults false */
        commitOnChange: PT.bool,
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
        /** Alignment of numbers in field, default to 'right' */
        textAlign: PT.oneOf(['left', 'right']),
        /** Icon to display on the left side of the field */
        leftIcon: PT.element,
        /** Whether text in field is selected when field receives focus */
        selectOnFocus: PT.bool
    };

    static shorthandValidator = /((\.\d+)|(\d+(\.\d+)?))(k|m|b)\b/gi;

    baseClassName = 'xh-number-input';

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }

    render() {
        const {props, hasFocus, renderValue} = this,
            textAlign = withDefault(props.textAlign, 'right'),
            displayValue = hasFocus ? renderValue : this.formatValue(renderValue);

        return numericInput({
            className: this.getClassName(),
            value: displayValue,
            onValueChange: this.onValueChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            tabIndex: props.tabIndex,
            style: {
                ...props.style,
                textAlign,
                width: props.width
            },
            buttonPosition: 'none',
            allowNumericCharactersOnly: !props.enableShorthandUnits,
            disabled: props.disabled,
            min: props.min,
            max: props.max,
            placeholder: props.placeholder,
            leftIcon: props.leftIcon
        });
    }

    onValueChange = (val, valAsString) => {
        let value = this.parseValue(valAsString);
        value = isNaN(value) ? null : value;
        this.noteValueChange(value);
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') this.doCommit();
    }

    formatValue(value) {
        if (value == null) return '';
        const props = this.props,
            precision = props.precision != null ? props.precision : 4,
            zeroPad = !!props.zeroPad,
            formattedVal = fmtNumber(value, {precision, zeroPad});

        return props.displayWithCommas ? formattedVal : formattedVal.replace(/,/g, '');
    }

    parseValue(value) {
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
                    return NaN;
            }
        }

        return parseFloat(value);
    }

    onFocus = (ev) => {
        if (this.props.selectOnFocus) {
            ev.target.select();
        }
        this.noteFocused();
    }
}
export const numberInput = elemFactory(NumberInput);