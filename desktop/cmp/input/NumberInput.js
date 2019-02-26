/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {isNumber, isNaN} from 'lodash';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {numericInput} from '@xh/hoist/kit/blueprint';
import {fmtNumber} from '@xh/hoist/format';
import {HoistInput} from '@xh/hoist/cmp/input';
import {withDefault} from '@xh/hoist/utils/js';
import {wait} from '@xh/hoist/promise';

/**
 * Number input, with optional support for formatted of display value, shorthand units, and more.
 *
 * This component is built on the Blueprint NumericInput and gets default increment/decrement
 * functionality from that component, based on the three stepSize props.
 *
 * This Hoist component hides the up/down buttons by default but keeps the keyboard handling.
 * Users can use the following keys to increment/decrement:
 *
 *      ↑/↓           by one step
 *      Shift + ↑/↓   by one major step
 *      Alt + ↑/↓     by one minor step
 *
 * Set the corresponding stepSize prop(s) to null to disable this feature.
 */
@HoistComponent
@LayoutSupport
export class NumberInput extends HoistInput {

    static propTypes = {
        ...HoistInput.propTypes,
        value: PT.number,

        /** True to focus the control on render. */
        autoFocus: PT.bool,

        /** True to commit on every change/keystroke, default false. */
        commitOnChange: PT.bool,

        /** True to insert commas in displayed value. */
        displayWithCommas: PT.bool,

        /** True to convert entries suffixed with k/m/b to thousands/millions/billions. */
        enableShorthandUnits: PT.bool,

        /** True to take up the full width of container. */
        fill: PT.bool,

        /** Icon to display inline on the left side of the input. */
        leftIcon: PT.element,

        /** Minimum value */
        min: PT.number,

        /** Major step size for increment/decrement handling. */
        majorStepSize: PT.number,

        /** Maximum value */
        max: PT.number,

        /** Minor step size for increment/decrement handling. */
        minorStepSize: PT.number,

        /** Callback for normalized keypress event. */
        onKeyPress: PT.func,

        /** Text to display when control is empty. */
        placeholder: PT.string,

        /** Max decimal precision of the value, defaults to 4. */
        precision: PT.number,

        /** Element to display inline on the right side of the input. */
        rightElement: PT.element,

        /** True to select contents when control receives focus. */
        selectOnFocus: PT.bool,

        /** Standard step size for increment/decrement handling. */
        stepSize: PT.number,

        /** Alignment of entry text within control, default 'right'. */
        textAlign: PT.oneOf(['left', 'right']),

        /** True to pad with trailing zeros out to precision, default false. */
        zeroPad: PT.bool
    };

    static shorthandValidator = /((\.\d+)|(\d+(\.\d+)?))(k|m|b)\b/i;

    baseClassName = 'xh-number-input';

    get commitOnChange() {
        return withDefault(this.props.commitOnChange, false);
    }

    render() {
        const props = this.getNonLayoutProps(),
            {width, ...layoutProps} = this.getLayoutProps();

        return numericInput({
            value: this.formatRenderValue(this.renderValue),

            allowNumericCharactersOnly: !props.enableShorthandUnits,
            buttonPosition: 'none',
            disabled: props.disabled,
            fill: props.fill,
            leftIcon: props.leftIcon,
            max: props.max,
            majorStepSize: props.majorStepSize,
            min: props.min,
            minorStepSize: props.minorStepSize,
            placeholder: props.placeholder,
            rightElement: props.rightElement,
            stepSize: props.stepSize,
            tabIndex: props.tabIndex,

            id: props.id,
            className: this.getClassName(),
            style: {
                ...props.style,
                ...layoutProps,
                width: withDefault(width, 200),
                textAlign: withDefault(props.textAlign, 'right')
            },
            onBlur: this.onBlur,
            onFocus: this.onFocus,
            onKeyPress: this.onKeyPress,
            onValueChange: this.onValueChange
        });
    }

    onValueChange = (val, valAsString) => {
        this.noteValueChange(valAsString);
    }

    toExternal(val) {
        val = this.parseValue(val);
        return isNaN(val) ? null : val;
    }

    onKeyPress = (ev) => {
        if (ev.key === 'Enter') this.doCommit();
        if (this.props.onKeyPress) this.props.onKeyPress(ev);
    }

    formatRenderValue(value) {
        if (value == null) return '';

        if (this.hasFocus) return value;

        const props = this.props,
            precision = props.precision != null ? props.precision : 4,
            zeroPad = !!props.zeroPad,
            formattedVal = fmtNumber(value, {precision, zeroPad});

        return props.displayWithCommas ? formattedVal : formattedVal.replace(/,/g, '');
    }

    parseValue(value) {
        if (value == null || value == '') return null;
        if (isNumber(value)) return value;

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
        this.noteFocused();

        // Deferred to allow any value conversion to complete and flush into input.
        if (this.props.selectOnFocus) {
            const target = ev.target;
            wait(1).then(() => target.select());
        }
    }
}
export const numberInput = elemFactory(NumberInput);