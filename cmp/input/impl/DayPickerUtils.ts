/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {DayPickerProps, Matcher} from '@xh/hoist/kit/react-day-picker';
import {isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {castArray, isNil, omitBy} from 'lodash';

export interface DayPickerSpec {
    /** Currently selected date, if any. Any time component is ignored by the calendar. */
    value: Date;
    /** Earliest selectable day, inclusive. Earlier days are disabled and cannot be navigated to. */
    minDate?: Date;
    /** Latest selectable day, inclusive. Later days are disabled and cannot be navigated to. */
    maxDate?: Date;
    /** Month to show first. Defaults to the month of the value, or the bound closest to today. */
    initialMonth?: Date;
    /** App-provided props merged into the result. Selection wiring cannot be overridden. */
    dayPickerProps?: Partial<DayPickerProps>;
    /** Called with the day the user picked. Never called with null. */
    onSelect: (date: Date) => void;
}

/**
 * Build the props for a single-selection react-day-picker calendar from a Hoist DateInput's
 * state. Shared by the desktop and mobile DateInputs so the two cannot drift.
 */
export function getDayPickerProps(spec: DayPickerSpec): Partial<DayPickerProps> {
    const {value, initialMonth, dayPickerProps, onSelect} = spec,
        minDate = resolveBoundDate(spec.minDate),
        maxDate = resolveBoundDate(spec.maxDate),
        disabled: Matcher[] = [];

    if (minDate) disabled.push({before: minDate});
    if (maxDate) disabled.push({after: maxDate});
    if (dayPickerProps?.disabled) disabled.push(...castArray(dayPickerProps.disabled));

    return omitBy(
        {
            defaultMonth: initialMonth ?? value ?? getClosestBound(minDate, maxDate),
            startMonth: minDate,
            endMonth: maxDate,
            fixedWeeks: true,
            showOutsideDays: true,
            ...dayPickerProps,
            mode: 'single',
            required: true,
            selected: value,
            disabled,
            onSelect
        },
        isNil
    );
}

/** Resolve a min/max bound to a Date at the start of its day, or null if unset. */
export function resolveBoundDate(val: Date | LocalDate): Date {
    if (val == null) return null;
    return isLocalDate(val) ? val.date : stripTime(val);
}

export function stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// react-day-picker opens on today when there is no value, which may lie outside the bounds.
// Open on the nearest bound instead.
function getClosestBound(minDate: Date, maxDate: Date): Date {
    const today = new Date();
    if (minDate && today < minDate) return minDate;
    if (maxDate && today > maxDate) return maxDate;
    return null;
}
