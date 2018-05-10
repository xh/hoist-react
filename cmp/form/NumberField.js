/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {replace} from 'lodash';
import {hoistComponent, elemFactory} from 'hoist/core';
import {numericInput} from 'hoist/kit/blueprint';
import {fmtNumber} from 'hoist/format';
import {HoistField} from './HoistField';

/**
 * A Number Input Field
 *
 * @see HoistField for properties additional to those documented below.
 */
@hoistComponent()
export class NumberField extends HoistField {

    static propTypes = {
        /** Text to display when control is empty */
        placeholder: PT.string,
        /** minimum value */
        min: PT.number,
        /** maximum value */
        max: PT.number,
        /** Number of decimal places to allow on field's value, defaults to 4*/
        precision: PT.number,
        /** Allow/automatically fill trailing zeros in accord with precision, defaults to false*/
        zeroPad: PT.bool,
        /** Constrain input to numeric characters, defaults to true. Set to false for advanced input evaluation */
        allowNumericCharactersOnly: PT.bool,
        /** Whether to display large values with commas */
        displayWithDelimiters: PT.bool
    };

    static shortHandMatcher = /((\.\d+)|(\d+(\.\d+)?))(k|m|b)\b/gi;
    
    delegateProps = ['className', 'min', 'max', 'placeholder'];

    render() {
        const {width, style, allowNumericCharactersOnly} = this.props;

        return numericInput({
            value: this.renderValue,
            onValueChange: this.onValueChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {textAlign: 'right', width, ...style},
            buttonPosition: 'none',
            allowNumericCharactersOnly: allowNumericCharactersOnly !== false,
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
        value = this.normalizeValue(value);
        value = parseFloat(value);
        return isFinite(value) ? value : null;
    }

    toInternal(value) {
        if (value == null) return '';
        const precision = this.props.precision || 4,
            zeroPad = !!this.props.zeroPad,
            formattedVal = fmtNumber(value, {precision, zeroPad});

        return this.props.displayWithDelimiters ? formattedVal : this.normalizeValue(formattedVal);
    }

    normalizeValue(value) {
        value = replace(value, /,/g, '');
        return replace(value, NumberField.shortHandMatcher, this.expandShorthand);
    }

    expandShorthand(value) {
        if (!value) {
            return value;
        }

        const num = +value.substring(0, value.length - 1),
            lastChar = value.charAt(value.length - 1).toLowerCase();

        let result;

        if (lastChar === 'k') {
            result = num * 1000;
        } else if (lastChar === 'm') {
            result = num * 1000000;
        } else if (lastChar === 'b') {
            result = num * 1000000000;
        }

        const isValid = result != null && !isNaN(result);


        return isValid ? result.toString() : '';
    }

}
export const numberField = elemFactory(NumberField);