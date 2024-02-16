/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistProps, HSide, LayoutProps, StyleProps} from '@xh/hoist/core';
import {ReactElement, ReactNode, Ref} from 'react';

export interface DesktopNumberInputProps
    extends HoistProps,
        LayoutProps,
        StyleProps,
        HoistInputProps {
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
    onKeyDown?: (e: KeyboardEvent) => void;

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
