/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, HSide} from '@xh/hoist/core';
import {fmtNumber} from '@xh/hoist/format';
import {input} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import {wait} from '@xh/hoist/promise';
import {debounced, throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isNaN, isNil, isNumber, round} from 'lodash';
import './NumberInput.scss';

export interface NumberInputProps extends HoistInputProps {
    value?: number;

    /** True to commit on every change/keystroke, default false. */
    commitOnChange?: boolean;

    /** True to insert commas in displayed value. */
    displayWithCommas?: boolean;

    /** True to convert entries suffixed with k/m/b to thousands/millions/billions. */
    enableShorthandUnits?: boolean;

    /**
     * Minimum value. Note that this will govern the smallest value that this control can produce
     * via user input. Smaller values passed to it via props or a bound model will still be displayed.
     */
    min?: number;

    /**
     * Maximum value. Note that this will govern the largest value that this control can produce
     * via user input. Larger values passed to it via props or a bound model will still be displayed.
     */
    max?: number;

    /** Onsen modifier string. */
    modifier?: string;

    /** Function which receives keydown event. */
    onKeyDown?: (e:KeyboardEvent) => void;

    /** Text to display when control is empty. */
    placeholder?: string;

    /** Max decimal precision of the value, defaults to 4. */
    precision?: number;

    /**
     * Scale factor to apply when converting between the internal and external value. Useful for
     * cases such as handling a percentage value where the user would expect to see or input 20 but
     * the external value the input is bound to should be 0.2. Must be a factor of 10.
     * Defaults to 1 (no scaling applied).
     */
    scaleFactor?: number;

    /** True to select contents when control receives focus. */
    selectOnFocus?: boolean;

    /** Alignment of entry text within control, default 'right'. */
    textAlign?: HSide;

    /**
     * Text appended to the rendered value within control when not editing.
     * Can be used to append e.g. "%" or a unit without need for an external right label.
     */
    valueLabel?: string;

    /** True to pad with trailing zeros out to precision, default false. */
    zeroPad?: boolean;
}

/**
 * Number input, with optional support for formatting of display value, shorthand units, and more.
 */
export const [NumberInput, numberInput] = hoistCmp.withFactory<NumberInputProps>({
    displayName: 'NumberInput',
    className: 'xh-number-input',
    render(props, ref) {
        return useHoistInputModel(cmp, props, ref, NumberInputModel);
    }
});
(NumberInput as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class NumberInputModel extends HoistInputModel {
    xhImpl = true;

    static shorthandValidator = /((\.\d+)|(\d+(\.\d+)?))([kmb])\b/i;

    constructor() {
        super();
        throwIf(Math.log10(this.scaleFactor) % 1 !== 0, 'scaleFactor must be a factor of 10');
    }

    get precision() {
        return withDefault(this.componentProps.precision, 4);
    }

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

    onValueChange = (ev) => {
        this.noteValueChange(ev.target.value);
    };

    @debounced(250)
    doCommitOnChangeInternal() {
        super.doCommitOnChangeInternal();
    }

    toInternal(val) {
        if (isNaN(val)) return val;
        if (isNil(val)) return null;

        return val * this.scaleFactor;
    }

    toExternal(val) {
        val = this.parseValue(val);
        if (isNaN(val)) return val;
        if (isNil(val)) return null;

        val = val / this.scaleFactor;

        // Round to scale corrected precision
        let {precision} = this;
        if (!isNil(precision)) {
            precision = precision + Math.log10(this.scaleFactor);
            val = round(val, precision);
        }
        return val;
    }

    isValid(val) {
        const {min, max} = this.componentProps;

        if (isNaN(val)) return false;
        if (val === null) return true;

        // Enforce min/max here on commit.
        if (!isNil(min) && val < min) return false;
        if (!isNil(max) && val > max) return false;

        return true;
    }

    onKeyDown = (ev) => {
        if (ev.key === 'Enter') this.doCommit();
        this.componentProps.onKeyDown?.(ev);
    };

    onFocus = (ev) => {
        this.noteFocused();

        // Deferred to allow any value conversion to complete and flush into input.
        if (this.componentProps.selectOnFocus) {
            const {target} = ev;
            if (target?.select) wait().then(() => target.select());
        }
    };

    formatRenderValue(value) {
        const {componentProps, precision} = this;

        if (value == null) return '';

        if (this.hasFocus) {
            if (isNumber(value) && !isNil(precision)) value = round(value, precision);
            return value.toString();
        }

        const {valueLabel, displayWithCommas} = componentProps,
            zeroPad = withDefault(componentProps.zeroPad, false),
            formattedVal = fmtNumber(value, {precision, zeroPad, label: valueLabel, labelCls: null, asHtml: true});

        return displayWithCommas ? formattedVal : formattedVal.replace(/,/g, '');
    }

    parseValue(value) {
        if (isNil(value) || value === '') return null;
        if (isNumber(value)) return value;

        value = value.toString();
        value = value.replace(/,/g, '');

        if (NumberInputModel.shorthandValidator.test(value)) {
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

const cmp = hoistCmp.factory<NumberInputModel>(
    ({model, className, enableShorthandUnits, ...props}, ref) => {
        const {width, ...layoutProps} = getLayoutProps(props),
            {hasFocus} = model,
            renderValue = model.formatRenderValue(model.renderValue),
            // use 'number' to edit values, but 'text' to displaying formatted values.
            type = hasFocus && !enableShorthandUnits ? 'number' : 'text',
            inputMode = !enableShorthandUnits ? 'decimal' : 'text';

        return input({
            type,
            inputMode,
            className,
            value: renderValue,
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

            onChange: model.onValueChange,
            onKeyDown: model.onKeyDown,
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            ref
        });
    }
);