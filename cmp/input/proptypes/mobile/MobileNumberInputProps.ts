import {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistProps, HSide, LayoutProps, StyleProps} from '@xh/hoist/core';

export interface MobileNumberInputProps
    extends HoistProps,
        HoistInputProps,
        StyleProps,
        LayoutProps {
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
