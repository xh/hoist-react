/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {HoistInputModel, useHoistInputModel} from '@xh/hoist/cmp/input';
import {DesktopNumberInputProps} from '@xh/hoist/cmp/input';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {fmtNumber, parseNumber} from '@xh/hoist/format';
import {numericInput} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import {apiRemoved, debounced, TEST_ID, throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isNaN, isNil, isNumber, round} from 'lodash';
import {useLayoutEffect} from 'react';

export type NumberInputProps = DesktopNumberInputProps;

/**
 * Number input, with optional support for formatting of display value, shorthand units, and more.
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
export const [NumberInput, numberInput] = hoistCmp.withFactory<NumberInputProps>({
    displayName: 'NumberInput',
    className: 'xh-number-input',
    render(props, ref) {
        apiRemoved(`fill`, {test: props['fill'], msg: 'Use the `flex` prop instead.', v: '58'});
        return useHoistInputModel(cmp, props, ref, NumberInputModel);
    }
});
(NumberInput as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class NumberInputModel extends HoistInputModel {
    override xhImpl = true;

    constructor() {
        super();
        throwIf(Math.log10(this.scaleFactor) % 1 !== 0, 'scaleFactor must be a factor of 10');
    }

    get precision(): number {
        return withDefault(this.componentProps.precision, 4);
    }

    override get commitOnChange(): boolean {
        return withDefault(this.componentProps.commitOnChange, false);
    }

    get scaleFactor(): number {
        return withDefault(this.componentProps.scaleFactor, 1);
    }

    onValueChange = (val, valAsString) => {
        this.noteValueChange(valAsString);
    };

    @debounced(250)
    override doCommitOnChangeInternal() {
        super.doCommitOnChangeInternal();
    }

    override toInternal(val: number): number {
        if (isNaN(val)) return val;
        if (isNil(val)) return null;
        return val * this.scaleFactor;
    }

    override toExternal(val: number): number {
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

    override isValid(val: number): boolean {
        const {min, max} = this.componentProps;

        if (isNaN(val)) return false;
        if (val === null) return true;

        // Enforce min/max here on commit. BP props only limit the incremental step change
        if (!isNil(min) && val < min) return false;
        if (!isNil(max) && val > max) return false;

        return true;
    }

    onKeyDown = (ev: KeyboardEvent) => {
        if (ev.key === 'Enter') this.doCommit();
        this.componentProps.onKeyDown?.(ev);
    };

    formatRenderValue(value: number) {
        const {componentProps, precision} = this;

        if (value == null) return '';

        if (this.hasFocus) {
            const ret = isNumber(value) && !isNil(precision) ? round(value, precision) : value;
            return ret?.toString();
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

    parseValue(value: number) {
        return parseNumber(value);
    }

    override noteFocused() {
        super.noteFocused();
        if (this.componentProps.selectOnFocus) {
            // Deferred to allow any value conversion to complete and flush into input.
            wait().then(() => this.inputEl?.select());
        }
    }
}

const cmp = hoistCmp.factory<NumberInputModel>(({model, className, ...props}, ref) => {
    const {width, flex, ...layoutProps} = getLayoutProps(props),
        renderValue = model.formatRenderValue(model.renderValue);

    // BP workaround -- min, max, and stepsize can block Blueprint from rendering
    // intended value in underlying control -- ensure it is always shown.
    useLayoutEffect(() => {
        const input = model.inputEl;
        if (input) input.value = renderValue;
    });

    // BP bases expected precision off of dps in minorStepSize, if specified.
    // The default BP value of 0.1 for this prop emits a console warning any time the input
    // value extends beyond 1 dp. Re-default here to sync with our `precision` prop.
    // See https://blueprintjs.com/docs/#core/components/numeric-input.numeric-precision
    const {precision} = model,
        majorStepSize = props.majorStepSize,
        minorStepSize = precision
            ? withDefault(props.minorStepSize, round(Math.pow(10, -precision), precision))
            : null;

    // Render BP input.
    return numericInput({
        value: renderValue,
        allowNumericCharactersOnly: !props.enableShorthandUnits && !props.displayWithCommas,
        buttonPosition: 'none',
        disabled: props.disabled,
        inputRef: composeRefs(model.inputRef, props.inputRef),
        leftIcon: props.leftIcon,
        min: props.min,
        max: props.max,
        minorStepSize,
        majorStepSize,
        placeholder: props.placeholder,
        rightElement: props.rightElement,
        stepSize: props.stepSize,
        tabIndex: props.tabIndex,
        autoFocus: props.autoFocus,

        id: props.id,
        className,
        style: {
            ...props.style,
            ...layoutProps,
            width: withDefault(width, 200),
            flex: withDefault(flex, null),
            textAlign: withDefault(props.textAlign, 'right')
        },
        [TEST_ID]: props.testId,
        onBlur: model.onBlur,
        onFocus: model.onFocus,
        onKeyDown: model.onKeyDown,
        onValueChange: model.onValueChange,
        ref
    });
});
