/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {HoistComponent, LayoutSupport, elemFactory} from '@xh/hoist/core';
import {input} from '@xh/hoist/kit/onsen';
import {fmtNumber} from '@xh/hoist/format';
import {withDefault} from '@xh/hoist/utils/js';
import {wait} from '@xh/hoist/promise';

import './NumberInput.scss';
import {HoistInput} from '@xh/hoist/cmp/input';

/**
 * Number Input, with optional support for formatted of display value,
 */
@HoistComponent
@LayoutSupport
export class NumberInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.number,

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /** Whether to display large values with commas */
        displayWithCommas: PT.bool,

        /** Set to true for advanced input evaluation, defaults to false.
         Inputs suffixed with k, m, or b will be calculated as thousands, millions, or billions respectively */
        enableShorthandUnits: PT.bool,

        /** Minimum value */
        min: PT.number,

        /** Maximum value */
        max: PT.number,

        /** Onsen modifier string */
        modifier: PT.string,

        /** Function which receives keypress event */
        onKeyPress: PT.func,

        /** Text to display when control is empty */
        placeholder: PT.string,

        /** Number of decimal places to allow on field's value, defaults to 4 */
        precision: PT.number,

        /** Whether text in field is selected when field receives focus */
        selectOnFocus: PT.bool,

        /** Alignment of entry text within control, default 'right'. */
        textAlign: PT.oneOf(['left', 'right']),

        /** Allow/automatically fill in trailing zeros in accord with precision, defaults to false */
        zeroPad: PT.bool
    };

    static shorthandValidator = /((\.\d+)|(\d+(\.\d+)?))(k|m|b)\b/gi;

    baseClassName = 'xh-number-input';

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }

    render() {
        const props = this.getNonLayoutProps(),
            {width, ...layoutProps} = this.getLayoutProps(),
            {hasFocus, renderValue} = this,
            displayValue = hasFocus ? this.displayValue(renderValue) : this.formatValue(renderValue);

        return input({
            value: displayValue,

            type: props.enableShorthandUnits ? 'text' : 'number',
            disabled: props.disabled,
            min: props.min,
            max: props.max,
            placeholder: props.placeholder,
            modifier: props.modifier,
            tabIndex: props.tabIndex,

            className: this.getClassName(),
            style: {
                ...props.style,
                ...layoutProps,
                width: withDefault(width, null),
                textAlign: withDefault(props.textAlign, 'right')
            },
            spellCheck: false,

            onChange: this.onChange,
            onKeyPress: this.onKeyPress,
            onBlur: this.onBlur,
            onFocus: this.onFocus
        });
    }

    onChange = (ev) => {
        let value = this.parseValue(ev.target.value);
        value = isNaN(value) ? null : value;
        this.noteValueChange(value);
    };

    onKeyPress = (ev) => {
        const {onKeyPress} = this.props;
        if (ev.key === 'Enter') this.doCommit();
        if (onKeyPress) onKeyPress(ev);
    };

    onFocus = (ev) => {
        this.noteFocused();

        // Deferred to allow any value conversion to complete and flush into input.
        if (this.props.selectOnFocus) {
            const target = ev.target;
            if (target && target.select) wait(1).then(() => target.select());
        }
    };

    displayValue(value) {
        if (value == null) return '';
        return value.toString();
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

}

export const numberInput = elemFactory(NumberInput);