/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {fmtNumber} from '@xh/hoist/format';
import {input} from '@xh/hoist/kit/onsen';
import {wait} from '@xh/hoist/promise';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isNaN, isNil} from 'lodash';
import PT from 'prop-types';
import './NumberInput.scss';

/**
 * Number Input, with optional support for formatted of display value,
 */
export const [NumberInput, numberInput] = hoistCmp.withFactory({
    displayName: 'NumberInput',
    className: 'xh-number-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, Model);
    }
});
NumberInput.propTypes = {
    ...HoistInputPropTypes,
    value: PT.number,

    /** True to commit on every change/keystroke, default false. */
    commitOnChange: PT.bool,

    /** Whether to display large values with commas */
    displayWithCommas: PT.bool,

    /** Set to true for advanced input evaluation, defaults to false.
     Inputs suffixed with k, m, or b will be calculated as thousands, millions, or billions respectively */
    enableShorthandUnits: PT.bool,


    /**
     * Minimum value.  Note that this will govern the smallest value that this control can produce
     * via user input.  Smaller values passed to it via props or a bound model will still be displayed.
     */
    min: PT.number,

    /**
     * Maximum value.  Note that this will govern the largest value that this control can produce
     * via user input.  Larger values passed to it via props or a bound model will still be displayed.
     */
    max: PT.number,

    /** Onsen modifier string */
    modifier: PT.string,

    /** Function which receives keydown event */
    onKeyDown: PT.func,

    /** Text to display when control is empty */
    placeholder: PT.string,

    /** Number of decimal places to allow on field's value, defaults to 4 */
    precision: PT.number,

    /**
     * Scale factor to apply when converting between the internal and external value. Useful for
     * cases such as handling a percentage value where the user would expect to see or input 20 but
     * the external value the input is bound to should be 0.2. Defaults to 1 (no scaling applied).
     */
    scaleFactor: PT.number,

    /** Whether text in field is selected when field receives focus */
    selectOnFocus: PT.bool,

    /** Alignment of entry text within control, default 'right'. */
    textAlign: PT.oneOf(['left', 'right']),

    /**
     * Text appended to the rendered value within control when not editing.
     * Can be used to append e.g. "%" or a unit without need for an external right label.
     */
    valueLabel: PT.string,

    /** Allow/automatically fill in trailing zeros in accord with precision, defaults to false */
    zeroPad: PT.bool
};
NumberInput.hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------

class Model extends HoistInputModel {

    static shorthandValidator = /((\.\d+)|(\d+(\.\d+)?))([kmb])\b/gi;

    get commitOnChange() {
        return withDefault(this.componentProps.commitOnChange, false);
    }

    get scaleFactor() {
        return withDefault(this.componentProps.scaleFactor, 1);
    }

    select() {
        // first focus, and then wait one tick for value to be put into input element
        this.focus();
        wait().then(() => super.select());
    }

    onChange = (ev) => {
        let value = this.parseValue(ev.target.value);
        value = isNaN(value)  ? null : value;
        this.noteValueChange(value);
    };

    toInternal(val) {
        return isNil(val) ? null : val * this.scaleFactor;
    }

    toExternal(val) {
        const {min, max} = this.componentProps;
        val = this.parseValue(val);
        if (isNaN(val) || isNil(val)) return null;

        val = val / this.scaleFactor;

        // Enforce min/max here. This is in addition to the onsen props which
        // only limit the incremental step change.
        return ((!isNil(min) && val < min) || (!isNil(max) && val > max)) ?
            this.externalValue :
            val;
    }

    onKeyDown = (ev) => {
        if (ev.key === 'Enter') this.doCommit();
        this.componentProps.onKeyDown?.(ev);
    };

    onFocus = (ev) => {
        this.noteFocused();

        // Deferred to allow any value conversion to complete and flush into input.
        if (this.componentProps.selectOnFocus) {
            const target = ev.target;
            if (target && target.select) wait().then(() => target.select());
        }
    };

    displayValue(value) {
        if (value == null) return '';
        return value.toString();
    }

    formatValue(value) {
        if (value == null) return '';

        const {componentProps} = this,
            {valueLabel, displayWithCommas} = componentProps,
            precision = withDefault(componentProps.precision, 4),
            zeroPad = withDefault(componentProps.zeroPad, false),
            formattedVal = fmtNumber(value, {precision, zeroPad, label: valueLabel, labelCls: null, asHtml: true});

        return displayWithCommas ? formattedVal : formattedVal.replace(/,/g, '');
    }

    parseValue(value) {
        if (!value) return value;
        value = value.toString();
        value = value.replace(/,/g, '');

        if (Model.shorthandValidator.test(value)) {
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

const cmp = hoistCmp.factory(
    ({model, className, enableShorthandUnits, ...props}, ref) => {
        const {width, ...layoutProps} = getLayoutProps(props),
            {hasFocus, renderValue} = model,
            displayValue = hasFocus ? model.displayValue(renderValue) : model.formatValue(renderValue),
            // use 'number' to edit values, but 'text' to displaying formatted values.
            type = hasFocus && !enableShorthandUnits ? 'number' : 'text',
            inputMode = !enableShorthandUnits ? 'decimal' : 'text';

        return input({
            type,
            inputMode,
            className,
            value: displayValue,
            disabled: props.disabled,
            min: props.min,
            max: props.max,
            placeholder: props.placeholder,
            modifier: props.modifier,
            tabIndex: props.tabIndex,

            style: {
                ...props.style,
                ...layoutProps,
                width: withDefault(width, null),
                textAlign: withDefault(props.textAlign, 'right')
            },
            spellCheck: false,

            onChange: model.onChange,
            onKeyDown: model.onKeyDown,
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            ref
        });
    }
);
