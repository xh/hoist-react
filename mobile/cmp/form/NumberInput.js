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
import './NumberInput.scss';

/**
 * A Number Input
 *
 * @see HoistInput for properties additional to those documented below.
 */
@HoistComponent
export class NumberInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,

        /** Value of the control */
        value: PT.string,

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

    delegateProps = ['className', 'disabled', 'min', 'max', 'placeholder', 'modifier'];

    baseClassName = 'xh-number-input';

    render() {
        const {width, style, enableShorthandUnits} = this.props;

        return input({
            className: this.getClassName(),
            value: this.renderValue || '',
            onChange: this.onChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            style: {width, ...style},
            spellCheck: false,
            type: enableShorthandUnits ? 'text' : 'number',
            ...this.getDelegateProps()
        });
    }

    onChange = (ev) => {
        let v = ev.target.value;
        if (v) v = v.toString();
        this.noteValueChange(v);
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') this.doCommit();
        if (this.props.onKeyPress) this.props.onKeyPress(ev);
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

    onBlur = () => {
        this.noteBlurred();
    }

    onFocus = (ev) => {
        if (this.props.selectOnFocus && ev.target && ev.target.select) {
            ev.target.select();
        }
        this.noteFocused();
    }
}

export const numberInput = elemFactory(NumberInput);