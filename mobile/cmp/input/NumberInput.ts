/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {fmtNumber} from '@xh/hoist/format';
import {input} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import {wait} from '@xh/hoist/promise';
import {debounced, throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isNaN, isNil, isNumber, round} from 'lodash';
import {MobileNumberInputProps as NumberInputProps} from '@xh/hoist/cmp/input';
import './NumberInput.scss';

export {NumberInputProps};

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
    override xhImpl = true;

    static shorthandValidator = /((\.\d+)|(\d+(\.\d+)?))([kmb])\b/i;

    constructor() {
        super();
        throwIf(Math.log10(this.scaleFactor) % 1 !== 0, 'scaleFactor must be a factor of 10');
    }

    get precision() {
        return withDefault(this.componentProps.precision, 4);
    }

    override get commitOnChange() {
        return withDefault(this.componentProps.commitOnChange, false);
    }

    get scaleFactor() {
        return withDefault(this.componentProps.scaleFactor, 1);
    }

    get enableShorthandUnits() {
        return withDefault(this.componentProps.enableShorthandUnits, false);
    }

    override select() {
        // first focus, and then wait one tick for value to be put into input element
        this.focus();
        wait().then(() => super.select());
    }

    onValueChange = ev => {
        this.noteValueChange(ev.target.value);
    };

    @debounced(250)
    override doCommitOnChangeInternal() {
        super.doCommitOnChangeInternal();
    }

    override toInternal(val) {
        if (isNaN(val)) return val;
        if (isNil(val)) return null;

        return val * this.scaleFactor;
    }

    override toExternal(val) {
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

    override isValid(val) {
        const {min, max} = this.componentProps;

        if (isNaN(val)) return false;
        if (val === null) return true;

        // Enforce min/max here on commit.
        if (!isNil(min) && val < min) return false;
        if (!isNil(max) && val > max) return false;

        return true;
    }

    onKeyDown = ev => {
        if (ev.key === 'Enter') this.doCommit();
        this.componentProps.onKeyDown?.(ev);
    };

    override onFocus = ev => {
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
            formattedVal = fmtNumber(value, {
                precision,
                zeroPad,
                label: valueLabel,
                labelCls: null,
                asHtml: true
            }) as string;

        return displayWithCommas ? formattedVal : formattedVal.replace(/,/g, '');
    }

    parseValue(value) {
        if (isNil(value) || value === '') return null;
        if (isNumber(value)) return value;

        value = value.toString();
        value = value.replace(/,/g, '');

        if (this.enableShorthandUnits && NumberInputModel.shorthandValidator.test(value)) {
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
            renderValue = model.formatRenderValue(model.renderValue),
            inputMode = enableShorthandUnits ? 'text' : 'decimal';

        // Using type=text rather than type=number, to support shorthand units and rich
        // rendering but also because of issues with typing in decimal point (see #3450)
        // Rely on inputMode, and Hoist's parsing to enforce numbers only.
        return input({
            inputMode,
            className,
            value: renderValue,
            disabled: props.disabled,
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

            onInput: model.onValueChange,
            onKeyDown: model.onKeyDown,
            onBlur: model.onBlur,
            onFocus: model.onFocus,
            ref
        });
    }
);
