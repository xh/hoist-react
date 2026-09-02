/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {LocalDate} from '@xh/hoist/utils/datetime';
import {throwIf} from '@xh/hoist/utils/js';
import {isFinite, isFunction, isPlainObject, isString} from 'lodash';
import type {
    DateRangeCalendarUnit,
    DateRangeContext,
    DateRangePickerTab,
    DateRangePreset,
    DateRangeSelection,
    DateRangeUnit,
    LocalDateRange,
    ResolvedDateRange
} from './Types';

/** All picker tabs, in their default rail order. */
export const DATE_RANGE_PICKER_TABS: DateRangePickerTab[] = [
    'presets',
    'relative',
    'monthYear',
    'custom'
];

/** Calendar units offered on the Relative tab's unit control, in display order. */
export const DATE_RANGE_CALENDAR_UNITS: DateRangeCalendarUnit[] = [
    'days',
    'weeks',
    'months',
    'quarters',
    'years'
];

/** All units valid for a relative selection. */
export const DATE_RANGE_UNITS: DateRangeUnit[] = [...DATE_RANGE_CALENDAR_UNITS, 'businessDays'];

/** Largest `count` accepted for a relative selection. */
export const MAX_RELATIVE_COUNT = 999;

/** Year bounds for month and year selections - shared by validation and picker navigation. */
export const MIN_SELECTION_YEAR = 1900;
export const MAX_SELECTION_YEAR = 9999;

/**
 * Resolve a selection to its current range, and to the comparable range immediately before it.
 * Throws if the selection is a preset unknown to the context - validate with
 * {@link parseDateRangeSelection} first for untrusted input.
 */
export function resolveDateRange(
    sel: DateRangeSelection,
    ctx: DateRangeContext
): ResolvedDateRange {
    const {anchorDate, minDate, maxDate} = ctx;

    switch (sel.kind) {
        case 'preset': {
            const preset = ctx.presets[sel.token];
            throwIf(!preset, `Unknown date range preset: '${sel.token}'.`);
            const current = preset.resolve(ctx),
                prior = preset.resolvePrior
                    ? preset.resolvePrior(current, ctx)
                    : equalDurationPrior(current);
            return {current, prior};
        }

        case 'relative': {
            const {unit} = sel,
                count = Math.max(1, sel.count);

            if (unit === 'businessDays') {
                // The window ends on the anchor date, business day or not, and reaches back far
                // enough to hold `count` business days. The prior window holds the `count`
                // business days before it.
                const start = businessDayWindowStart(anchorDate, count, ctx),
                    priorEnd = start.previousDay();
                return {
                    current: {start, end: anchorDate},
                    prior: {start: businessDayWindowStart(priorEnd, count, ctx), end: priorEnd}
                };
            }

            // Days need no special case: a day is already a calendar boundary, so both
            // expressions below reduce to `anchorDate - count + 1` for that unit.
            const start = sel.snap
                    ? // Calendar-aligned - the current (partial) unit counts as one.
                      anchorDate.startOf(unit).subtract(count - 1, unit)
                    : // Rolling window of exactly `count` units ending on the anchor date.
                      anchorDate.subtract(count, unit).nextDay(),
                current = {start, end: anchorDate};
            return {current, prior: equalDurationPrior(current)};
        }

        case 'month':
            return resolveCalendarUnit(
                getMonthStart(sel.year, sel.month),
                'months',
                minDate,
                maxDate
            );

        case 'year':
            return resolveCalendarUnit(
                LocalDate.get(`${sel.year}-01-01`),
                'years',
                minDate,
                maxDate
            );

        case 'custom': {
            const current = {start: LocalDate.get(sel.start), end: LocalDate.get(sel.end)};
            return {current, prior: equalDurationPrior(current)};
        }
    }
}

/**
 * A full calendar month or year, clamped to `maxDate` (and `minDate`) when those dates fall
 * within it - so the current month reads as month-to-date, and the current year as year-to-date.
 * A period entirely beyond `maxDate` (e.g. a persisted pick from a user with a later anchor)
 * keeps its natural bounds rather than producing an inverted range.
 */
function resolveCalendarUnit(
    naturalStart: LocalDate,
    unit: 'months' | 'years',
    minDate: LocalDate,
    maxDate: LocalDate
): ResolvedDateRange {
    const naturalEnd = naturalStart.endOf(unit),
        start = minDate && minDate > naturalStart && minDate <= naturalEnd ? minDate : naturalStart,
        end = maxDate && maxDate >= naturalStart && maxDate < naturalEnd ? maxDate : naturalEnd,
        priorStart = naturalStart.subtract(1, unit);

    return {
        current: {start, end},
        prior:
            end === naturalEnd
                ? {start: priorStart, end: priorStart.endOf(unit)}
                : // Clamped to a partial period - compare against the same span one unit earlier.
                  {start: priorStart, end: end.subtract(1, unit)}
    };
}

/**
 * Start of the window ending on `end` (inclusive) that holds `count` business days per the
 * context. Bounded, to guard against an `isBusinessDay` that never returns true.
 */
function businessDayWindowStart(end: LocalDate, count: number, ctx: DateRangeContext): LocalDate {
    let day = end,
        found = ctx.isBusinessDay(day) ? 1 : 0;
    for (let i = 0, limit = count * 10 + 366; found < count && i < limit; i++) {
        day = day.previousDay();
        if (ctx.isBusinessDay(day)) found++;
    }
    return day;
}

/** The immediately preceding range of equal duration in days, or null if `current` is unbounded. */
function equalDurationPrior({start, end}: LocalDateRange): LocalDateRange | null {
    if (!start || !end) return null;
    const dayCount = end.diff(start, 'days') + 1;
    return {start: start.subtract(dayCount, 'days'), end: end.subtract(dayCount, 'days')};
}

/**
 * Validate and normalize a raw (e.g. persisted or app-supplied) value into a
 * {@link DateRangeSelection}. Accepts a bare preset token string as shorthand for a preset
 * selection. Returns null for anything unrecognized, out of bounds, or naming a preset not in
 * `presets` - callers should substitute their default.
 */
export function parseDateRangeSelection(
    raw: unknown,
    presets: Record<string, DateRangePreset>
): DateRangeSelection | null {
    if (isString(raw)) return presets[raw] ? {kind: 'preset', token: raw} : null;
    if (!isPlainObject(raw)) return null;

    const obj = raw as any;
    switch (obj.kind) {
        case 'preset':
            return isString(obj.token) && presets[obj.token]
                ? {kind: 'preset', token: obj.token}
                : null;

        case 'relative': {
            const count = Math.round(obj.count),
                {unit} = obj,
                isDayUnit = unit === 'days' || unit === 'businessDays';
            return isFinite(count) &&
                count >= 1 &&
                count <= MAX_RELATIVE_COUNT &&
                DATE_RANGE_UNITS.includes(unit)
                ? // Snap has no meaning at day grain - normalize it away so values compare equal.
                  {kind: 'relative', count, unit, snap: !isDayUnit && obj.snap === true}
                : null;
        }

        case 'month': {
            const {year, month} = obj;
            return isValidYear(year) && Number.isInteger(month) && month >= 1 && month <= 12
                ? {kind: 'month', year, month}
                : null;
        }

        case 'year':
            return isValidYear(obj.year) ? {kind: 'year', year: obj.year} : null;

        case 'custom': {
            const start = parseIsoDate(obj.start),
                end = parseIsoDate(obj.end);
            if (!start || !end) return null;
            return start <= end
                ? {kind: 'custom', start: start.isoString, end: end.isoString}
                : {kind: 'custom', start: end.isoString, end: start.isoString};
        }

        default:
            return null;
    }
}

function isValidYear(year: unknown): year is number {
    return (
        Number.isInteger(year) &&
        (year as number) >= MIN_SELECTION_YEAR &&
        (year as number) <= MAX_SELECTION_YEAR
    );
}

function parseIsoDate(s: unknown): LocalDate | null {
    if (!isString(s) || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    try {
        return LocalDate.get(s);
    } catch {
        return null;
    }
}

/**
 * Short label for a selection, suitable for the picker trigger - e.g. `MTD`, `Last 6 Months`,
 * `Aug 2026`, `2025`, or `Custom`.
 *
 * A period that can be selected two ways reads the same either way: the `ytd` preset and a
 * current-year pick on the Months & Years tab both read `YTD`, and `lastYear` and a prior-year
 * pick both read as that year.
 */
export function getDateRangeLabel(sel: DateRangeSelection, ctx: DateRangeContext): string {
    switch (sel.kind) {
        case 'preset': {
            const preset = ctx.presets[sel.token];
            throwIf(!preset, `Unknown date range preset: '${sel.token}'.`);
            return evalLabel(preset.label, ctx);
        }
        case 'relative':
            return `Last ${sel.count} ${getDateRangeUnitLabel(sel.unit, sel.count)}`;
        case 'month':
            return getMonthStart(sel.year, sel.month).format('MMM YYYY');
        case 'year': {
            // A year cut short at the anchor date is the same range as the `ytd` preset, so it
            // takes the same name. A year clamped by an explicit `maxDate` is not "to date".
            const {current} = resolveDateRange(sel, ctx);
            return current.end === ctx.anchorDate && current.end < current.start.endOfYear()
                ? 'YTD'
                : String(sel.year);
        }
        case 'custom':
            return 'Custom';
    }
}

/** Display name for a preset's row within the picker - its `name`, falling back to its `label`. */
export function getDateRangePresetName(preset: DateRangePreset, ctx: DateRangeContext): string {
    return evalLabel(preset.name ?? preset.label, ctx);
}

function evalLabel(label: DateRangePreset['label'], ctx: DateRangeContext): string {
    return isFunction(label) ? label(ctx) : label;
}

const UNIT_LABELS: Record<DateRangeUnit, string> = {
    days: 'Day',
    weeks: 'Week',
    months: 'Month',
    quarters: 'Quarter',
    years: 'Year',
    businessDays: 'Business Day'
};

/** Title-case unit label, singular when count is 1 - e.g. `Days`, `Month`, `Business Days`. */
export function getDateRangeUnitLabel(unit: DateRangeUnit, count: number = 2): string {
    const singular = UNIT_LABELS[unit];
    return count === 1 ? singular : `${singular}s`;
}

/**
 * Format a range as `start ▸ end` using a moment.js format string, with `…` for an unbounded
 * edge. A single-day range formats as that one date. Returns an empty string for a null range.
 */
export function fmtDateRange(range: LocalDateRange, dateFormat: string = 'YYYY-MM-DD'): string {
    if (!range) return '';
    const {start, end} = range,
        fmt = (d: LocalDate) => (d ? d.format(dateFormat) : '…');
    return start && start === end ? fmt(start) : `${fmt(start)} ▸ ${fmt(end)}`;
}

/** First day of the given month (1-12) of the given year. */
export function getMonthStart(year: number, month: number): LocalDate {
    return LocalDate.get(`${year}-${String(month).padStart(2, '0')}-01`);
}

/**
 * Move a selection by `steps` periods of its own length - negative to go back, positive to go
 * forward. Month and year selections step by calendar unit and keep their kind. All other
 * selections step by their resolved length in days and become `custom` selections, as their dates
 * are now fixed rather than relative.
 *
 * Steps are clamped to the context's `minDate` and `maxDate` - a range that would overshoot a bound
 * slides up against it instead. Returns null when the selection cannot move at all: it is already
 * at the bound, or is unbounded.
 */
export function stepDateRangeSelection(
    sel: DateRangeSelection,
    steps: number,
    ctx: DateRangeContext
): DateRangeSelection | null {
    if (!steps) return null;
    const {minDate, maxDate} = ctx;

    if (sel.kind === 'month' || sel.kind === 'year') {
        const unit = sel.kind === 'month' ? 'months' : 'years',
            start =
                sel.kind === 'month'
                    ? getMonthStart(sel.year, sel.month)
                    : LocalDate.get(`${sel.year}-01-01`),
            // Never step beyond the period containing a bound, or below the supported years.
            maxStart = maxDate.startOf(unit),
            minStart = (minDate ?? LocalDate.get(`${MIN_SELECTION_YEAR}-01-01`)).startOf(unit);

        let next = start.add(steps, unit);
        if (next > maxStart) next = maxStart;
        if (next < minStart) next = minStart;
        if (next === start) return null;

        const year = next.moment.year();
        return sel.kind === 'month'
            ? {kind: 'month', year, month: next.moment.month() + 1}
            : {kind: 'year', year};
    }

    const {start, end} = resolveDateRange(sel, ctx).current;
    if (!start || !end) return null;

    const dayCount = end.diff(start, 'days') + 1;
    let nextStart = start.add(dayCount * steps, 'days'),
        nextEnd = end.add(dayCount * steps, 'days');

    if (nextEnd > maxDate) {
        nextEnd = maxDate;
        nextStart = maxDate.subtract(dayCount - 1, 'days');
    }
    if (minDate && nextStart < minDate) {
        nextStart = minDate;
        nextEnd = minDate.add(dayCount - 1, 'days');
        // A range longer than the bounds themselves - fill them.
        if (nextEnd > maxDate) nextEnd = maxDate;
    }
    if (nextStart === start && nextEnd === end) return null;

    return {kind: 'custom', start: nextStart.isoString, end: nextEnd.isoString};
}
