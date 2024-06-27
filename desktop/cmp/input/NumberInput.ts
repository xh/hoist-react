/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {HoistInputModel, HoistInputProps, useHoistInputModel} from '@xh/hoist/cmp/input';
import {hoistCmp, HSide, LayoutProps, StyleProps} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {fmtNumber, parseNumber} from '@xh/hoist/format';
import {numericInput} from '@xh/hoist/kit/blueprint';
import {wait} from '@xh/hoist/promise';
import {debounced, TEST_ID, throwIf, withDefault} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isNaN, isNil, isNumber, round} from 'lodash';
import {KeyboardEventHandler, ReactElement, ReactNode, Ref, useLayoutEffect} from 'react';

export interface NumberInputProps
    extends LayoutProps,
        StyleProps,
        HoistInputProps<HTMLInputElement> {
    value?: number;

    /** True to focus the control on render. */
    autoFocus?: boolean;

    /** True to commit on every change/keystroke, default false. */
    commitOnChange?: boolean;

    /** True to insert commas in displayed value. */
    displayWithCommas?: boolean;

    /** True to convert entries suffixed with k/m/b to thousands/millions/billions. */
    enableShorthandUnits?: boolean;

    /** Ref handler that receives HTML <input> element backing this component. */
    inputRef?: Ref<HTMLInputElement>;

    /** Icon to display inline on the left side of the input. */
    leftIcon?: ReactElement;

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

    /** Minor step size for increment/decrement handling. */
    minorStepSize?: number;

    /** Major step size for increment/decrement handling. */
    majorStepSize?: number;

    /** Callback for normalized keydown event. */
    onKeyDown?: KeyboardEventHandler<HTMLInputElement>;

    /** Text to display when control is empty. */
    placeholder?: string;

    /** Max decimal precision of the value, defaults to 4. */
    precision?: number;

    /** Element to display inline on the right side of the input. */
    rightElement?: ReactNode;

    /**
     * Scale factor to apply when converting between the internal and external value. Useful for
     * cases such as handling a percentage value where the user would expect to see or input 20 but
     * the external value the input is bound to should be 0.2. Must be a factor of 10.
     * Defaults to 1 (no scaling applied).
     */
    scaleFactor?: number;

    /** True to select contents when control receives focus. */
    selectOnFocus?: boolean;

    /** Standard step size for increment/decrement handling. */
    stepSize?: number;

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
        return useHoistInputModel(cmp, props, ref, NumberInputModel);
    }
});
(NumberInput as any).hasLayoutSupport = true;

//-----------------------
// Implementation
//-----------------------
class NumberInputModel extends HoistInputModel<HTMLInputElement> {
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

    onKeyDown: KeyboardEventHandler<HTMLInputElement> = ev => {
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

const cmp = hoistCmp.factory<NumberInputModel>(({model, className, ...props}) => {
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
        onValueChange: model.onValueChange
    });
});
