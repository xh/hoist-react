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
    DateRangeContext,
    DateRangePickerTab,
    DateRangePreset,
    DateRangeSelection,
    DateRangeUnit,
    LocalDateRange,
    PresetDateRangeSelection,
    RelativeDateRangeSelection,
    ResolvedDateRange
} from './Types';

/** All picker tabs, in their default display order. */
export const DATE_RANGE_PICKER_TABS: DateRangePickerTab[] = [
    'presets',
    'relative',
    'monthYear',
    'custom'
];

/** Units offered on the Relative tab's unit control, in display order. */
export const DATE_RANGE_UNITS: DateRangeUnit[] = ['days', 'weeks', 'months', 'quarters', 'years'];

/** Largest `count` accepted for a relative selection. */
export const MAX_RELATIVE_COUNT = 999;

/** Furthest a preset or relative selection can be stepped from its natural range, either way. */
export const MAX_STEP_OFFSET = 9999;

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
            const preset = getPreset(sel.token, ctx);
            return applyOffset(
                preset.resolve(ctx),
                range => resolvePresetPrior(preset, range, ctx),
                range => resolvePresetNext(preset, range, ctx),
                sel.offset
            );
        }

        case 'relative': {
            const {unit} = sel,
                count = Math.max(1, sel.count),
                // Days need no special case: a day is already a calendar boundary, so both
                // expressions below reduce to `anchorDate - count + 1` for that unit.
                start = sel.snap
                    ? // Calendar-aligned - the current (partial) unit counts as one.
                      anchorDate.startOf(unit).subtract(count - 1, unit)
                    : // Rolling window of exactly `count` units ending on the anchor date.
                      anchorDate.subtract(count, unit).nextDay();
            return applyOffset(
                {start, end: anchorDate},
                range => shiftRelative(sel, range, -1, ctx),
                range => shiftRelative(sel, range, 1, ctx),
                sel.offset
            );
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
 * Step a natural range `|offset|` periods - back via its prior-range logic, forward via its
 * next-range logic - then compute the prior of where it lands. Stops early if the range becomes
 * unbounded; `stepDateRangeSelection` refuses offsets the range cannot reach.
 */
function applyOffset(
    current: LocalDateRange,
    priorFn: (range: LocalDateRange) => LocalDateRange | null,
    nextFn: (range: LocalDateRange) => LocalDateRange | null,
    offset: number = 0
): ResolvedDateRange {
    const stepFn = offset < 0 ? priorFn : nextFn;
    for (let i = 0; i < Math.abs(offset); i++) {
        const stepped = stepFn(current);
        if (!stepped) break;
        current = stepped;
    }
    return {current, prior: priorFn(current)};
}

function resolvePresetPrior(
    preset: DateRangePreset,
    range: LocalDateRange,
    ctx: DateRangeContext
): LocalDateRange | null {
    return preset.resolvePrior ? preset.resolvePrior(range, ctx) : shiftByDuration(range, -1);
}

function resolvePresetNext(
    preset: DateRangePreset,
    range: LocalDateRange,
    ctx: DateRangeContext
): LocalDateRange | null {
    return preset.resolveNext ? preset.resolveNext(range, ctx) : shiftByDuration(range, 1);
}

/**
 * Compare like against like: a lookback in weeks or larger units steps by the same units,
 * matching the equivalent presets - so 3 months ending May 31 compares against 3 months ending
 * Feb 28, not 92 days. Days keep an equal number of days, with a single day walking by business
 * day when the model is in `businessDayMode`. `dir` is -1 for the prior range, 1 for the next.
 */
function shiftRelative(
    sel: RelativeDateRangeSelection,
    {start, end}: LocalDateRange,
    dir: 1 | -1,
    ctx: DateRangeContext
): LocalDateRange {
    const {unit} = sel,
        count = Math.max(1, sel.count) * dir;
    if (unit !== 'days') return {start: start.add(count, unit), end: end.add(count, unit)};
    if (Math.abs(count) === 1 && ctx.businessDayMode) {
        return singleDay(dir < 0 ? previousBusinessDay(start, ctx) : nextBusinessDay(start, ctx));
    }
    return shiftByDuration({start, end}, dir);
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
 * The adjacent range of equal duration in days - preceding for `dir` -1, following for 1 - or
 * null if `current` is unbounded.
 */
function shiftByDuration({start, end}: LocalDateRange, dir: 1 | -1): LocalDateRange | null {
    if (!start || !end) return null;
    const days = (end.diff(start, 'days') + 1) * dir;
    return {start: start.add(days, 'days'), end: end.add(days, 'days')};
}

/** The immediately preceding range of equal duration in days, or null if `current` is unbounded. */
function equalDurationPrior(range: LocalDateRange): LocalDateRange | null {
    return shiftByDuration(range, -1);
}

/** A range of the one given day. */
export function singleDay(day: LocalDate): LocalDateRange {
    return {start: day, end: day};
}

/**
 * The nearest business day strictly before `date`, per the context's `isBusinessDay`. Bounded, to
 * guard against a test that never returns true.
 */
export function previousBusinessDay(date: LocalDate, ctx: BusinessDayContext): LocalDate {
    let ret = date.previousDay();
    for (let i = 0; i < 366 && !ctx.isBusinessDay(ret); i++) ret = ret.previousDay();
    return ret;
}

/** The nearest business day strictly after `date`, per the context's `isBusinessDay`. Bounded. */
export function nextBusinessDay(date: LocalDate, ctx: BusinessDayContext): LocalDate {
    let ret = date.nextDay();
    for (let i = 0; i < 366 && !ctx.isBusinessDay(ret); i++) ret = ret.nextDay();
    return ret;
}

/** `date` itself if it is a business day, else the nearest business day before it. */
export function businessDayOnOrBefore(date: LocalDate, ctx: BusinessDayContext): LocalDate {
    return ctx.isBusinessDay(date) ? date : previousBusinessDay(date, ctx);
}

type BusinessDayContext = Pick<DateRangeContext, 'isBusinessDay'>;

/**
 * The day before `date` - the previous business day in `businessDayMode`, else the previous
 * calendar day. The step taken by single-day presets and their prior ranges.
 */
export function previousDayInMode(date: LocalDate, ctx: DateRangeContext): LocalDate {
    return ctx.businessDayMode ? previousBusinessDay(date, ctx) : date.previousDay();
}

/** The day after `date` - the next business day in `businessDayMode`, else the next calendar day. */
export function nextDayInMode(date: LocalDate, ctx: DateRangeContext): LocalDate {
    return ctx.businessDayMode ? nextBusinessDay(date, ctx) : date.nextDay();
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
        case 'preset': {
            const offset = parseOffset(obj.offset);
            return isString(obj.token) && presets[obj.token] && offset != null
                ? withOffset({kind: 'preset', token: obj.token}, offset)
                : null;
        }

        case 'relative': {
            const count = Math.round(obj.count),
                offset = parseOffset(obj.offset),
                {unit} = obj;
            return isFinite(count) &&
                count >= 1 &&
                count <= MAX_RELATIVE_COUNT &&
                DATE_RANGE_UNITS.includes(unit) &&
                offset != null
                ? // Snap has no meaning at day grain - normalize it away so values compare equal.
                  withOffset(
                      {kind: 'relative', count, unit, snap: unit !== 'days' && obj.snap === true},
                      offset
                  )
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

/** A missing offset is zero. Anything else must be an integer within ±MAX_STEP_OFFSET. */
function parseOffset(raw: unknown): number | null {
    if (raw == null) return 0;
    return Number.isInteger(raw) && Math.abs(raw as number) <= MAX_STEP_OFFSET
        ? (raw as number)
        : null;
}

/** The selection at the given offset, in normalized form - `offset` present only when non-zero. */
function withOffset<T extends PresetDateRangeSelection | RelativeDateRangeSelection>(
    sel: T,
    offset: number
): T {
    const {offset: _, ...rest} = sel;
    return (offset ? {...rest, offset} : rest) as T;
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
 * Short label for a selection, suitable for the picker trigger - e.g. `MTD`, `Prev 6 Months`,
 * `Aug 2026`, `2025`, or `Custom`.
 *
 * A period that can be selected two ways reads the same either way: the `ytd` preset and a
 * current-year pick on the Months & Years tab both read `YTD`, and `prevYear` and a prior-year
 * pick both read as that year.
 *
 * Once stepped to a non-zero offset, the trigger's dates locate the range and the label describes
 * only its shape: a rolling window reads as its length (`7 Days`, `3 Months`), a named period as
 * the period (`Jul 2026`), and a to-date preset as its name with the signed offset (`MTD −1`,
 * `MTD +1`).
 */
export function getDateRangeLabel(sel: DateRangeSelection, ctx: DateRangeContext): string {
    switch (sel.kind) {
        case 'preset': {
            const preset = getPreset(sel.token, ctx),
                {offset} = sel;
            if (!offset) return evalLabel(preset.label, ctx);
            return preset.shiftedLabel
                ? preset.shiftedLabel(resolveDateRange(sel, ctx).current, offset, ctx)
                : `${evalLabel(preset.label, ctx)} ${fmtDateRangeOffset(offset)}`;
        }
        case 'relative': {
            const length = `${sel.count} ${getDateRangeUnitLabel(sel.unit, sel.count)}`;
            return sel.offset ? length : `Prev ${length}`;
        }
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

/** A signed offset as `−n` or `+n`, with a true minus sign - the default suffix for a stepped label. */
export function fmtDateRangeOffset(offset: number): string {
    return `${offset < 0 ? '−' : '+'}${Math.abs(offset)}`;
}

function getPreset(token: string, ctx: DateRangeContext): DateRangePreset {
    const preset = ctx.presets[token];
    throwIf(!preset, `Unknown date range preset: '${token}'.`);
    return preset;
}

const UNIT_LABELS: Record<DateRangeUnit, string> = {
    days: 'Day',
    weeks: 'Week',
    months: 'Month',
    quarters: 'Quarter',
    years: 'Year'
};

/** Title-case unit label, singular when count is 1 - e.g. `Days`, `Month`. */
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
 * Move a selection by `steps` periods - negative to go back, positive to go forward. No selection
 * changes kind:
 *
 * - Preset and relative selections adjust their `offset`, stepping through their own prior- and
 *   next-range logic - so a lookback in months steps by months, and a single day steps by
 *   business day in `businessDayMode`. Their natural range ends on the anchor date, so a positive
 *   offset is reachable only when `maxDate` allows dates beyond it.
 * - Month and year selections step by calendar unit.
 * - Custom selections step by their length in days - or by business day when a single day in
 *   `businessDayMode`.
 *
 * Steps stop at the context's `minDate` and `maxDate`. Returns null when the selection cannot
 * move that way: it is already at a bound, or unbounded.
 */
export function stepDateRangeSelection(
    sel: DateRangeSelection,
    steps: number,
    ctx: DateRangeContext
): DateRangeSelection | null {
    if (!steps) return null;
    const {minDate, maxDate} = ctx;

    if (sel.kind === 'preset' || sel.kind === 'relative') {
        const offset = sel.offset ?? 0,
            nextOffset = Math.max(-MAX_STEP_OFFSET, Math.min(MAX_STEP_OFFSET, offset + steps));
        if (nextOffset === offset) return null;

        const next = withOffset(sel, nextOffset),
            {current} = resolveDateRange(next, ctx),
            {current: prev} = resolveDateRange(sel, ctx);
        // Unbounded, or the prior/next logic could not reach the requested offset.
        if (!current.start || !current.end) return null;
        if (current.start === prev.start && current.end === prev.end) return null;
        // A stepped range may not lie entirely outside the bounds.
        if (current.end > maxDate || (minDate && current.start < minDate)) return null;
        return next;
    }

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
        // No move, or clamping reversed the direction - e.g. stepping forward from a period
        // already beyond `maxDate`.
        if (steps > 0 ? next <= start : next >= start) return null;

        const year = next.moment.year();
        return sel.kind === 'month'
            ? {kind: 'month', year, month: next.moment.month() + 1}
            : {kind: 'year', year};
    }

    const {start, end} = resolveDateRange(sel, ctx).current;
    if (!start || !end) return null;

    // A single day walks by business day in that mode - stopping at a bound rather than crossing it.
    if (start === end && ctx.businessDayMode) {
        let day = start;
        for (let i = 0; i < Math.abs(steps); i++) {
            day = steps > 0 ? nextBusinessDay(day, ctx) : previousBusinessDay(day, ctx);
        }
        if (day > maxDate || (minDate && day < minDate)) return null;
        return {kind: 'custom', start: day.isoString, end: day.isoString};
    }

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
    // As above - never move against the requested direction.
    if (steps > 0 ? nextEnd <= end : nextStart >= start) return null;

    return {kind: 'custom', start: nextStart.isoString, end: nextEnd.isoString};
}
