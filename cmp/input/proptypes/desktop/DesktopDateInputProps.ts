/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PopperBoundary, PopperModifiers} from '@blueprintjs/core';
import {ITimePickerProps} from '@blueprintjs/datetime';
import {HoistInputProps} from '@xh/hoist/cmp/input/HoistInputProps';
import {HoistProps, HSide, LayoutProps, Some} from '@xh/hoist/core';
import {Position} from '@xh/hoist/kit/blueprint';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {ReactElement, ReactNode} from 'react';
import {DayPickerProps} from 'react-day-picker';

export interface DesktopDateInputProps extends HoistProps, LayoutProps, HoistInputProps {
    value?: Date | LocalDate;

    /** Props passed to ReactDayPicker component, as per DayPicker docs. */
    dayPickerProps?: DayPickerProps;

    /** Enable using the DatePicker popover. Default true. */
    enablePicker?: boolean;

    /** Enable using the text control to enter date as text. Default true. */
    enableTextInput?: boolean;

    /** True to show a "clear" button aligned to the right of the control. Default false. */
    enableClear?: boolean;

    /**
     * MomentJS format string for date display. Defaults to `YYYY-MM-DD HH:mm:ss`,
     * with default presence of time components determined by the timePrecision prop.
     */
    formatString?: string;

    /**
     * MomentJS format string(s) for date parsing. Defaults to the format string, followed by an
     * additional set of common variants.  Default presence of time components in these strings is
     * determined by the timePrecision prop.  Formats will be evaluated in priority order specified
     * as described here: https://momentjs.com/guides/#/parsing/multiple-formats/
     */
    parseStrings?: Some<string>;

    /**
     * Month to display in calendar popover on first render.
     *
     * If unspecified will default to the month of the current value (if present) or closest
     * valid value.
     */
    initialMonth?: Date | LocalDate;

    /** Icon to display inline on the left side of the input. */
    leftIcon?: ReactElement;

    /**
     * Element to display inline on the right side of the input. Note if provided, this will
     * take the place of the (default) calendar-picker button and (optional) clear button.
     */
    rightElement?: ReactNode;

    /**
     * Maximum (inclusive) valid date that can be entered by the user via the calendar picker or
     * keyboard.  Will reset any out-of-bounds manually entered input to `null`.
     *
     * Note that this does not prevent the application from setting a value for this control
     * programmatically out of this range.  It is also distinct from FormModel based validation,
     * which will flag an invalid date in a Form. For Form usages, it may be advisable to set
     * validation constraints in addition to this property.
     */
    maxDate?: Date | LocalDate;

    /**
     * Maximum (inclusive) valid date that can be entered by the user via the calendar picker or
     * keyboard.  Will reset any out-of-bounds manually entered input to `null`.
     *
     * See note re. validation on maxDate, above.
     */
    minDate?: Date | LocalDate;

    /** Text to display when control is empty. */
    placeholder?: string;

    /**
     * Position for calendar popover, as per Blueprint docs.
     * @see https://blueprintjs.com/docs/#datetime/dateinput
     */
    popoverPosition?: Position;

    /** Boundary for calendar popover, as per Popper.js docs. Defaults to viewport. */
    popoverBoundary?: PopperBoundary;

    /** Modifiers for calendar popover, as per Blueprint docs. Defaults to null */
    popoverModifiers?: PopperModifiers;

    /** Container DOM element to render the calendar popover inside. Defaults to document body. */
    portalContainer?: HTMLElement;

    /** True to select contents when control receives focus. */
    selectOnFocus?: boolean;

    /** True to show a bar with Today + Clear buttons at bottom of date picker popover. */
    showActionsBar?: boolean;

    /** True to show the picker upon focusing the input. */
    showPickerOnFocus?: boolean;

    /**
     * True to parse any dates entered via the text input with moment's "strict" mode enabled.
     * This ensures that the input entry matches the format(s) specified by `parseStrings` exactly.
     * If it does not, the input will be considered invalid and the value set to `null`.
     * @see https://momentjs.com/guides/#/parsing/strict-mode/
     */
    strictInputParsing?: boolean;

    /** Alignment of entry text within control, default 'left'. */
    textAlign?: HSide;

    /**
     * Props passed to the TimePicker, as per Blueprint docs.
     * @see https://blueprintjs.com/docs/#datetime/dateinput
     */
    timePickerProps?: ITimePickerProps;

    /**
     * The precision of time selection that accompanies the calendar.
     * If undefined, control will not show time. Ignored when valueType is localDate.
     */
    timePrecision?: 'second' | 'minute';

    /**
     * Type of value to publish. Defaults to 'date'. The use of 'localDate' is often a good
     * choice for use cases where there is no time component.
     * @see LocalDate - the class that will be published when localDate mode.
     */
    valueType?: 'date' | 'localDate';
}
