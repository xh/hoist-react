/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistInputModel, HoistInputPropTypes, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import {fmtNumber} from '@xh/hoist/format';
import {input} from '@xh/hoist/kit/onsen';
import {wait} from '@xh/hoist/promise';
import {withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isNaN} from 'lodash';
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

    /** Minimum value */
    min: PT.number,

    /** Maximum value */
    max: PT.number,

    /** Onsen modifier string */
    modifier: PT.string,

    /** Function which receives keydown event */
    onKeyDown: PT.func,

    /** Text to display when control is empty */
    placeholder: PT.string,

    /** Number of decimal places to allow on field's value, defaults to 4 */
    precision: PT.number,

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
        return withDefault(this.props.commitOnChange, false);
    }

    onChange = (ev) => {
        let value = this.parseValue(ev.target.value);
        value = isNaN(value) ? null : value;
        this.noteValueChange(value);
    };

    onKeyDown = (ev) => {
        const {onKeyDown} = this.props;
        if (ev.key === 'Enter') this.doCommit();
        if (onKeyDown) onKeyDown(ev);
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
            {valueLabel, displayWithCommas} = props,
            precision = withDefault(props.precision, 4),
            zeroPad = withDefault(props.zeroPad, false),
            formattedVal = fmtNumber(value, {precision, zeroPad, label: valueLabel, labelCls: null});

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
    ({model, className, ...props}, ref) => {

        const {width, ...layoutProps} = getLayoutProps(props),
            {hasFocus, renderValue} = model,
            displayValue = hasFocus ? model.displayValue(renderValue) : model.formatValue(renderValue);

        return input({
            value: displayValue,

            type: props.enableShorthandUnits ? 'text' : 'number',
            disabled: props.disabled,
            min: props.min,
            max: props.max,
            placeholder: props.placeholder,
            modifier: props.modifier,
            tabIndex: props.tabIndex,

            className,
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