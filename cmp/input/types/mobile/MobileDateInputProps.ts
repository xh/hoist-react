/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistProps, HSide, LayoutProps, PlainObject, StyleProps} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {ReactElement} from 'react';

export interface MobileDateInputProps extends HoistProps, HoistInputProps, StyleProps, LayoutProps {
    value?: Date | LocalDate;

    /** True to show a "clear" button aligned to the right of the control. Default false. */
    enableClear?: boolean;

    /**
     * MomentJS format string for date display and parsing. Defaults to `YYYY-MM-DD`.
     */
    formatString?: string;

    /**
     * Month to display in calendar popover on first render.
     *
     * If unspecified, will default to the month of the current value (if present), or today.
     */
    initialMonth?: Date | LocalDate;

    /** Icon to display inline on the left side of the input. */
    leftIcon?: ReactElement;

    /** Icon to display inline on the right side of the input. Defaults to a calendar icon */
    rightIcon?: ReactElement;

    /**
     * Maximum (inclusive) valid date. Controls which dates can be selected via the calendar
     * picker. Will reset any out-of-bounds manually entered input to `null`.
     *
     * Note this is distinct in these ways from FormModel based validation, which will leave an
     * invalid date entry in place but flag as invalid via FormField. For cases where it is
     * possible to use FormField, that is often a better choice.
     */
    maxDate?: Date | LocalDate;

    /**
     * Minimum (inclusive) valid date. Controls which dates can be selected via the calendar
     * picker. Will reset any out-of-bounds manually entered input to `null`.
     *
     * See note re. validation on maxDate, above.
     */
    minDate?: Date | LocalDate;

    /** Text to display when control is empty. */
    placeholder?: string;

    /** Props passed to SingleDatePicker component, as per SingleDatePicker docs. */
    singleDatePickerProps?: PlainObject;

    /** Alignment of entry text within control, default 'left'. */
    textAlign?: HSide;

    /** Type of value to publish. Defaults to 'date'. */
    valueType?: 'date' | 'localDate';
}
