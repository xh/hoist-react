/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from 'hoist/core';
import {numericInput} from 'hoist/kit/blueprint';
import {fmtNumber} from 'hoist/format';
import {HoistField} from './HoistField';

/**
 * A Number Input Field
 *
 * @see HoistField for properties additional to those documented below.
 */
@HoistComponent()
export class NumberField extends HoistField {

    static propTypes = {
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
        supportShorthandUnits: PT.bool,
        /** Whether to display large values with commas */
        displayWithDelimiters: PT.bool,
        /** Alignment of numbers in field, default to 'right' */
        textAlign: PT.oneOf(['left', 'right'])
    };

    static shorthandValidator = /((\.\d+)|(\d+(\.\d+)?))(k|m|b)\b/gi;

    delegateProps = ['className', 'min', 'max', 'placeholder'];

    render() {
        const {width, style, supportShorthandUnits} = this.props,
            textAlign = this.props.textAlign || 'right';

        return numericInput({
            value: this.renderValue,
            onValueChange: this.onValueChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {textAlign, width, ...style},
            buttonPosition: 'none',
            allowNumericCharactersOnly: !supportShorthandUnits,
            ...this.getDelegateProps()
        });
    }

    onValueChange = (val, valAsString) => {
        this.noteValueChange(valAsString);
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') this.doCommit();
    }

    toExternal(value) {
        value = this.parseValue(value);
        return isNaN(value) ? null : value;
    }

    toInternal(value) {
        if (value == null) return '';
        const props = this.props,
            precision = props.precision != null ? props.precision : 4,
            zeroPad = !!props.zeroPad,
            formattedVal = fmtNumber(value, {precision, zeroPad});

        return this.props.displayWithDelimiters ? formattedVal : formattedVal.replace(/,/g, '');
    }

    parseValue(value) {
        value = value.replace(/,/g, '');

        if (NumberField.shorthandValidator.test(value)) {

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

}
export const numberField = elemFactory(NumberField);