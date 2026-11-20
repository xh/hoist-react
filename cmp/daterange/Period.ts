/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {LocalDate} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {isString} from 'lodash';
import {
    businessDayOnOrAfter,
    businessDayOnOrBefore,
    MAX_RELATIVE_COUNT,
    nextBusinessDay,
    previousBusinessDay
} from './DateRangeUtils';
import type {DateRangeContext, DateRangeUnit} from './Types';

/**
 * A span of time to step from a date: a count of units, back by default or forward. Written as a
 * string such as `3M`, or `+5D` for forward - see {@link parsePeriod}.
 */
export interface Period {
    /** Number of units, from 1 to {@link MAX_RELATIVE_COUNT}. */
    count: number;
    unit: DateRangeUnit;
    /** True to step forward from the date, false (default) to look back. */
    forward: boolean;
}

/** Options for {@link shiftByPeriod}. */
export interface ShiftByPeriodOptions {
    /**
     * `business` (default) to count days as business days and land other units on a business day
     * in the period's direction. `calendar` for plain calendar arithmetic.
     */
    calendar?: 'business' | 'calendar';
    /** Whether a date is a business day. Default weekdays. */
    isBusinessDay?: DateRangeContext['isBusinessDay'];
}

/**
 * Read a period written as a count and a unit letter - `D`, `W`, `M`, `Q` or `Y` - with a leading
 * `+` for a forward period: `3M`, `+5D`. Returns null for anything else, including a count out of
 * range or a lower-case unit.
 */
export function parsePeriod(spec: unknown): Period | null {
    if (!isString(spec)) return null;
    const match = PERIOD_RE.exec(spec);
    if (!match) return null;
    const count = Number(match[2]);
    if (count < 1 || count > MAX_RELATIVE_COUNT) return null;
    return {count, unit: PERIOD_UNITS[match[3]], forward: match[1] === '+'};
}

/**
 * The date a period reaches from `date`. A look-back period gives the date one period before -
 * where a return over that period starts - and a forward period the date one period after.
 *
 * With business days (the default), `D` counts business days, and other units land on the nearest
 * business day in the period's direction: at or before the date reached for a look-back, at or
 * after it for a forward period. With `calendar: 'calendar'`, it is plain calendar arithmetic.
 *
 * @param period - a {@link Period}, or a string for {@link parsePeriod}. Throws if unreadable.
 */
export function shiftByPeriod(
    date: LocalDate,
    period: Period | string,
    opts: ShiftByPeriodOptions = {}
): LocalDate {
    const parsed = isString(period) ? parsePeriod(period) : period;
    throwIf(!parsed, `Unable to read period '${period}' - use a count and D, W, M, Q or Y.`);

    const {count, unit, forward} = parsed,
        {calendar = 'business', isBusinessDay = isWeekday} = opts;
    if (calendar === 'calendar') {
        return forward ? date.add(count, unit) : date.subtract(count, unit);
    }

    const ctx = {isBusinessDay};
    if (unit === 'days') {
        let ret = date;
        for (let i = 0; i < count; i++) {
            ret = forward ? nextBusinessDay(ret, ctx) : previousBusinessDay(ret, ctx);
        }
        return ret;
    }
    return forward
        ? businessDayOnOrAfter(date.add(count, unit), ctx)
        : businessDayOnOrBefore(date.subtract(count, unit), ctx);
}

//------------------
// Implementation
//------------------
const PERIOD_RE = /^(\+?)(\d+)([DWMQY])$/;

const PERIOD_UNITS: Record<string, DateRangeUnit> = {
    D: 'days',
    W: 'weeks',
    M: 'months',
    Q: 'quarters',
    Y: 'years'
};

const isWeekday = (date: LocalDate): boolean => date.isWeekday;
