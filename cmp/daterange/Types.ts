/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {LocalDate} from '@xh/hoist/utils/datetime';

/** An inclusive range of days. A null edge is unbounded. */
export interface LocalDateRange {
    start: LocalDate | null;
    end: LocalDate | null;
}

/** A selection resolved to its current range and the comparable range immediately before it. */
export interface ResolvedDateRange {
    current: LocalDateRange;
    /** The immediately preceding, non-overlapping range of comparable shape, or null if none. */
    prior: LocalDateRange | null;
}

/** Calendar units supported by relative selections. */
export type DateRangeUnit = 'days' | 'weeks' | 'months' | 'quarters' | 'years';

/**
 * How the picker renders a date - a moment.js format string, or a function for formats that
 * depend on the date itself, e.g. one that adds the year only when it is not the current year.
 */
export type DateRangeFormat = string | ((date: LocalDate) => string);

/** Tabs available within the DateRangePicker popover. */
export type DateRangePickerTab = 'presets' | 'relative' | 'period' | 'custom';

/**
 * The day that relative and to-date selections resolve against - see the `anchorDay` config of
 * {@link DateRangePickerModel}.
 *
 * - `'localDay'` - the current day in the browser's time zone, kept current as the day rolls.
 * - `'appDay'` - the current day in the app's time zone (`LocalDate.currentAppDay()`), likewise.
 * - A `LocalDate` - a pinned day that never moves, honored verbatim.
 * - A function returning a `LocalDate` - re-evaluated every few seconds and whenever any
 *   observables it reads change. Must be pure and cheap. For as-of dates with their own rule, e.g.
 *   the latest loaded data date, or a day that rolls forward at an evening cutoff.
 */
export type DateRangeAnchorDay = 'localDay' | 'appDay' | LocalDate | (() => LocalDate);

/** Tokens for the presets shipped with Hoist - see {@link dateRangePresets}. */
export type DateRangePresetToken =
    | 'anchorDay'
    | 'prevDay'
    | 'wtd'
    | 'mtd'
    | 'qtd'
    | 'ytd'
    | 'prev7Days'
    | 'prev30Days'
    | 'prev90Days'
    | 'prev3Months'
    | 'prev6Months'
    | 'prev12Months'
    | 'prevWeek'
    | 'prevMonth'
    | 'prevQuarter'
    | 'prevYear'
    | 'all';

/**
 * The dates a selection resolves against - the live state of a {@link DateRangePickerModel}.
 * Passed to preset resolvers and to the resolution utilities in this package.
 */
export interface DateRangeContext {
    /** Date that relative and to-date selections resolve against. */
    anchorDate: LocalDate;
    /**
     * The current day in the browser's time zone - what "Today" means to the person looking at
     * the screen, whatever zone the anchor date is drawn from.
     */
    today: LocalDate;
    /** Earliest selectable date, or null if unbounded. */
    minDate: LocalDate | null;
    /** Latest selectable date. Month and year selections spanning it are clamped to it. */
    maxDate: LocalDate;
    /** Whether a date is a business day - weekdays by default, or the model's `isBusinessDay`. */
    isBusinessDay: (date: LocalDate) => boolean;
    /** True if single-day selections step by business day - see the model config of that name. */
    businessDayMode: boolean;
    /** Presets available for selection, keyed by token. */
    presets: Record<string, DateRangePreset>;
}

/**
 * A named, one-click range offered on the picker's Presets tab. Hoist ships a set of common
 * presets ({@link dateRangePresets}) - apps can offer a subset of those, add their own, or both
 * via the `presets` config of {@link DateRangePickerModel}.
 */
export interface DateRangePreset {
    /** Unique key for this preset. Persisted as the `token` of a `preset` selection. */
    token: string;

    /** Short label for the picker trigger, e.g. `MTD`. May be derived from the context. */
    label: string | ((ctx: DateRangeContext) => string);

    /** Longer name for the preset's row in the picker, e.g. `Month to Date`. Default `label`. */
    name?: string | ((ctx: DateRangeContext) => string);

    /** Resolve this preset to a concrete range. */
    resolve: (ctx: DateRangeContext) => LocalDateRange;

    /**
     * Resolve the comparable prior range for a given current range. Default is the immediately
     * preceding range of equal duration in days, or null when the current range is unbounded.
     * Also drives stepping back: a selection at `offset` -n is this applied n times.
     */
    resolvePrior?: (current: LocalDateRange, ctx: DateRangeContext) => LocalDateRange | null;

    /**
     * Resolve the comparable range immediately after a given current range - the mirror of
     * `resolvePrior`, driving stepping forward when `maxDate` allows dates beyond the anchor.
     * Default is the immediately following range of equal duration in days, or null when the
     * current range is unbounded.
     */
    resolveNext?: (current: LocalDateRange, ctx: DateRangeContext) => LocalDateRange | null;

    /**
     * Label for this preset once stepped to a non-zero `offset`, when the trigger's dates locate
     * the range and the label need only describe its shape - e.g. `7 Days` for a rolling window,
     * or the month itself for a previous-month preset. Default is the label with the signed
     * offset appended, e.g. `MTD −1`.
     */
    shiftedLabel?: (range: LocalDateRange, offset: number, ctx: DateRangeContext) => string;
}

/** A one-click preset, re-resolved against the anchor date as time passes. */
export interface PresetDateRangeSelection {
    kind: 'preset';
    /** Token of a preset configured on the owning model. */
    token: string;
    /**
     * Number of periods stepped from the preset's natural range - negative for earlier periods,
     * each applying the preset's prior-range logic once, positive for later ones (reachable only
     * when `maxDate` allows dates beyond the anchor). Omitted when zero. See `stepRange()`.
     */
    offset?: number;
}

/** A lookback of `count` units ending on the anchor date. */
export interface RelativeDateRangeSelection {
    kind: 'relative';
    /** Number of units, from 1 to {@link MAX_RELATIVE_COUNT}. */
    count: number;
    unit: DateRangeUnit;
    /**
     * True to snap the window to calendar boundaries of `unit`, counting the current (partial)
     * unit as one - e.g. 3 calendar months ending today covers the prior two full months plus
     * the current month to date. False (default) for a rolling window of exactly `count` units
     * ending on the anchor date. Has no effect for days, where each day is its own boundary.
     */
    snap?: boolean;
    /** Periods stepped from the natural window - negative earlier, positive later. Omitted when zero. */
    offset?: number;
}

/** A calendar month, clamped to the context's `maxDate` when that date falls within it. */
export interface MonthDateRangeSelection {
    kind: 'month';
    year: number;
    /** Month of the year, 1-12. */
    month: number;
}

/** A calendar quarter, clamped to the context's `maxDate` when that date falls within it. */
export interface QuarterDateRangeSelection {
    kind: 'quarter';
    year: number;
    /** Quarter of the year, 1-4. */
    quarter: number;
}

/** A calendar year, clamped to the context's `maxDate` when that date falls within it. */
export interface YearDateRangeSelection {
    kind: 'year';
    year: number;
}

/** A fixed range of specific dates, as `YYYY-MM-DD` strings so the value persists as plain JSON. */
export interface CustomDateRangeSelection {
    kind: 'custom';
    start: string;
    end: string;
}

/**
 * The value of a {@link DateRangePickerModel} - a user's period selection, resolved to concrete
 * dates against a {@link DateRangeContext}. Plain JSON in all its forms, so it round-trips through
 * persistence without custom serialization.
 */
export type DateRangeSelection =
    | PresetDateRangeSelection
    | RelativeDateRangeSelection
    | MonthDateRangeSelection
    | QuarterDateRangeSelection
    | YearDateRangeSelection
    | CustomDateRangeSelection;
