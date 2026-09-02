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
export type DateRangeCalendarUnit = 'days' | 'weeks' | 'months' | 'quarters' | 'years';

/**
 * Units supported by relative selections. Business days are counted per the context's
 * `isBusinessDay` - weekdays by default - skipping the days that fail it.
 */
export type DateRangeUnit = DateRangeCalendarUnit | 'businessDays';

/** Tabs available within the DateRangePicker popover. */
export type DateRangePickerTab = 'presets' | 'relative' | 'monthYear' | 'custom';

/** Tokens for the presets shipped with Hoist - see {@link dateRangePresets}. */
export type DateRangePresetToken =
    | 'today'
    | 'yesterday'
    | 'wtd'
    | 'mtd'
    | 'qtd'
    | 'ytd'
    | 'last7Days'
    | 'last30Days'
    | 'last90Days'
    | 'last3Months'
    | 'last6Months'
    | 'last12Months'
    | 'lastWeek'
    | 'lastMonth'
    | 'lastQuarter'
    | 'lastYear'
    | 'lastBusinessDay'
    | 'priorMtd'
    | 'priorQtd'
    | 'priorYtd'
    | 'all';

/**
 * The dates a selection resolves against - the live state of a {@link DateRangePickerModel}.
 * Passed to preset resolvers and to the resolution utilities in this package.
 */
export interface DateRangeContext {
    /** Date that relative and to-date selections resolve against. */
    anchorDate: LocalDate;
    /** Earliest selectable date, or null if unbounded. */
    minDate: LocalDate | null;
    /** Latest selectable date. Month and year selections spanning it are clamped to it. */
    maxDate: LocalDate;
    /** Whether a date is a business day - weekdays by default, or the model's `isBusinessDay`. */
    isBusinessDay: (date: LocalDate) => boolean;
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
     */
    resolvePrior?: (current: LocalDateRange, ctx: DateRangeContext) => LocalDateRange | null;
}

/** A one-click preset, re-resolved against the anchor date as time passes. */
export interface PresetDateRangeSelection {
    kind: 'preset';
    /** Token of a preset configured on the owning model. */
    token: string;
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
     * ending on the anchor date. Has no effect for days or business days, where each day is its own
     * boundary.
     */
    snap?: boolean;
}

/** A calendar month, clamped to the context's `maxDate` when that date falls within it. */
export interface MonthDateRangeSelection {
    kind: 'month';
    year: number;
    /** Month of the year, 1-12. */
    month: number;
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
    | YearDateRangeSelection
    | CustomDateRangeSelection;
