/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {LocalDate} from '@xh/hoist/utils/datetime';
import {fmtDateRangeOffset, nextDayInMode, previousDayInMode, singleDay} from './DateRangeUtils';
import type {
    DateRangeContext,
    DateRangePreset,
    DateRangePresetToken,
    DateRangeUnit,
    LocalDateRange
} from './Types';

type Resolver = DateRangePreset['resolve'];
type Shifter = DateRangePreset['resolvePrior'];
type ShiftedLabel = DateRangePreset['shiftedLabel'];

/** From the start of the unit containing the anchor date, through the anchor date. */
const toDate =
    (unit: DateRangeUnit): Resolver =>
    ({anchorDate}) => ({start: anchorDate.startOf(unit), end: anchorDate});

/** A rolling window of `n` days ending on the anchor date. */
const prevDays =
    (n: number): Resolver =>
    ({anchorDate}) => ({start: anchorDate.subtract(n - 1, 'days'), end: anchorDate});

/** A rolling window of `n` months ending on the anchor date. */
const prevMonths =
    (n: number): Resolver =>
    ({anchorDate}) => ({start: anchorDate.subtract(n, 'months').nextDay(), end: anchorDate});

/** The full calendar unit before the one containing the anchor date. */
const previousUnit =
    (unit: DateRangeUnit): Resolver =>
    ctx => {
        const start = previousUnitStart(ctx, unit);
        return {start, end: start.endOf(unit)};
    };

const previousUnitStart = ({anchorDate}: DateRangeContext, unit: DateRangeUnit): LocalDate =>
    anchorDate.startOf(unit).subtract(1, unit);

/** The current range shifted by `n` units - negative back, positive forward - keeping its shape. */
const shiftedBy =
    (unit: DateRangeUnit, n: number): Shifter =>
    ({start, end}) => ({start: start.add(n, unit), end: end.add(n, unit)});

/** The full calendar unit `n` units from a current range that is itself a full unit. */
const adjacentUnit =
    (unit: DateRangeUnit, n: number): Shifter =>
    ({start}) => {
        const next = start.add(n, unit);
        return {start: next, end: next.endOf(unit)};
    };

/** The day before or after a single-day range - by business day in `businessDayMode`. */
const priorDay: Shifter = ({start}, ctx) => singleDay(previousDayInMode(start, ctx));
const nextDay: Shifter = ({start}, ctx) => singleDay(nextDayInMode(start, ctx));

/** Shifted label for a rolling window - its length alone, e.g. `7 Days`. */
const lengthLabel =
    (length: string): ShiftedLabel =>
    () =>
        length;

/** Shifted label for a previous-unit preset - the period the range now covers. */
const periodLabel =
    (format: string): ShiftedLabel =>
    ({start}: LocalDateRange) =>
        start.format(format);

const isAnchorToday = ({anchorDate, today}: DateRangeContext) => anchorDate === today;
const anchorLabel = (ctx: DateRangeContext) => (isAnchorToday(ctx) ? 'Today' : 'As Of');

/**
 * A single day `n` steps from the anchor day, in the T-1 idiom finance users speak - `Today −2`,
 * `As Of −1` - so a walk through single days reads the same however it began. Zero is the anchor
 * day itself.
 */
const dayFromAnchor = (n: number, ctx: DateRangeContext): string =>
    n ? `${anchorLabel(ctx)} ${fmtDateRangeOffset(n)}` : anchorLabel(ctx);

/**
 * Presets shipped with Hoist, keyed by token. Offer any subset (in any order) via the `presets`
 * config of {@link DateRangePickerModel}, alongside any app-defined {@link DateRangePreset}s.
 *
 * Labels describe a range without claiming it ends today, since the anchor date need not be
 * today: `Prev 7 Days` rather than `Last 7 Days`. The one exception is `anchorDay`, which reads
 * `Today` when the anchor date is the current day and `As Of` otherwise - the trigger's dates
 * supply the day itself.
 *
 * Period-to-date presets (`wtd`, `mtd`, `qtd`, `ytd`) resolve their prior range as the same span
 * one unit earlier - e.g. MTD on the 12th compares against the 1st through 12th of the prior
 * month. Previous-unit presets (`prevWeek`, `prevMonth`, ...) compare against the unit before.
 * Rolling windows compare against the window of equal length immediately preceding them. The
 * same logic, mirrored by `resolveNext`, drives stepping: `mtd` stepped back once is the prior MTD.
 *
 * A preset that names a specific period reads the same as a pick of that period on the Months &
 * Years tab - `prevMonth` labels as e.g. `Aug 2026` and `prevYear` as `2025` - so the trigger
 * describes the period, whichever way it was chosen. The underlying values stay distinct: a preset
 * re-resolves against the anchor date as time passes, where a pinned month or year does not.
 */
export const dateRangePresets: Record<DateRangePresetToken, DateRangePreset> = {
    anchorDay: {
        token: 'anchorDay',
        label: anchorLabel,
        name: ctx => (isAnchorToday(ctx) ? 'Today' : 'As Of Date'),
        resolve: ({anchorDate}) => singleDay(anchorDate),
        resolvePrior: priorDay,
        resolveNext: nextDay,
        shiftedLabel: (range, offset, ctx) => dayFromAnchor(offset, ctx)
    },
    prevDay: {
        token: 'prevDay',
        label: 'Prev Day',
        resolve: ctx => singleDay(previousDayInMode(ctx.anchorDate, ctx)),
        resolvePrior: priorDay,
        resolveNext: nextDay,
        // Already one step back - stepped, it reads from the anchor like `anchorDay` does.
        shiftedLabel: (range, offset, ctx) => dayFromAnchor(offset - 1, ctx)
    },
    wtd: {
        token: 'wtd',
        label: 'WTD',
        name: 'Week to Date',
        resolve: toDate('weeks'),
        resolvePrior: shiftedBy('weeks', -1),
        resolveNext: shiftedBy('weeks', 1)
    },
    mtd: {
        token: 'mtd',
        label: 'MTD',
        name: 'Month to Date',
        resolve: toDate('months'),
        resolvePrior: shiftedBy('months', -1),
        resolveNext: shiftedBy('months', 1)
    },
    qtd: {
        token: 'qtd',
        label: 'QTD',
        name: 'Quarter to Date',
        resolve: toDate('quarters'),
        resolvePrior: shiftedBy('quarters', -1),
        resolveNext: shiftedBy('quarters', 1)
    },
    ytd: {
        token: 'ytd',
        label: 'YTD',
        name: 'Year to Date',
        resolve: toDate('years'),
        resolvePrior: shiftedBy('years', -1),
        resolveNext: shiftedBy('years', 1)
    },
    prev7Days: {
        token: 'prev7Days',
        label: 'Prev 7 Days',
        resolve: prevDays(7),
        shiftedLabel: lengthLabel('7 Days')
    },
    prev30Days: {
        token: 'prev30Days',
        label: 'Prev 30 Days',
        resolve: prevDays(30),
        shiftedLabel: lengthLabel('30 Days')
    },
    prev90Days: {
        token: 'prev90Days',
        label: 'Prev 90 Days',
        resolve: prevDays(90),
        shiftedLabel: lengthLabel('90 Days')
    },
    prev3Months: {
        token: 'prev3Months',
        label: 'Prev 3 Months',
        resolve: prevMonths(3),
        resolvePrior: shiftedBy('months', -3),
        resolveNext: shiftedBy('months', 3),
        shiftedLabel: lengthLabel('3 Months')
    },
    prev6Months: {
        token: 'prev6Months',
        label: 'Prev 6 Months',
        resolve: prevMonths(6),
        resolvePrior: shiftedBy('months', -6),
        resolveNext: shiftedBy('months', 6),
        shiftedLabel: lengthLabel('6 Months')
    },
    prev12Months: {
        token: 'prev12Months',
        label: 'Prev 12 Months',
        resolve: prevMonths(12),
        resolvePrior: shiftedBy('years', -1),
        resolveNext: shiftedBy('years', 1),
        shiftedLabel: lengthLabel('12 Months')
    },
    prevWeek: {
        token: 'prevWeek',
        label: 'Prev Week',
        resolve: previousUnit('weeks'),
        resolvePrior: adjacentUnit('weeks', -1),
        resolveNext: adjacentUnit('weeks', 1),
        shiftedLabel: periodLabel('[Wk of] MMM D')
    },
    prevMonth: {
        token: 'prevMonth',
        label: ctx => previousUnitStart(ctx, 'months').format('MMM YYYY'),
        name: ctx => `Prev Month (${previousUnitStart(ctx, 'months').format('MMM YYYY')})`,
        resolve: previousUnit('months'),
        resolvePrior: adjacentUnit('months', -1),
        resolveNext: adjacentUnit('months', 1),
        shiftedLabel: periodLabel('MMM YYYY')
    },
    prevQuarter: {
        token: 'prevQuarter',
        label: ctx => previousUnitStart(ctx, 'quarters').format('[Q]Q YYYY'),
        name: ctx => `Prev Quarter (${previousUnitStart(ctx, 'quarters').format('[Q]Q YYYY')})`,
        resolve: previousUnit('quarters'),
        resolvePrior: adjacentUnit('quarters', -1),
        resolveNext: adjacentUnit('quarters', 1),
        shiftedLabel: periodLabel('[Q]Q YYYY')
    },
    prevYear: {
        token: 'prevYear',
        label: ctx => previousUnitStart(ctx, 'years').format('YYYY'),
        name: ctx => `Prev Year (${previousUnitStart(ctx, 'years').format('YYYY')})`,
        resolve: previousUnit('years'),
        resolvePrior: adjacentUnit('years', -1),
        resolveNext: adjacentUnit('years', 1),
        shiftedLabel: periodLabel('YYYY')
    },
    all: {
        token: 'all',
        label: 'All',
        name: 'All Dates',
        // Everything selectable - unbounded at the start unless the model sets a `minDate`.
        resolve: ({minDate, maxDate}) => ({start: minDate, end: maxDate}),
        resolvePrior: () => null,
        resolveNext: () => null
    }
};

/** Tokens of the presets shipped with Hoist, in a sensible display order. */
export const DATE_RANGE_PRESET_TOKENS = Object.keys(dateRangePresets) as DateRangePresetToken[];

/** Presets offered by {@link DateRangePickerModel} when none are configured. */
export const DEFAULT_DATE_RANGE_PRESETS: DateRangePresetToken[] = [
    'anchorDay',
    'prevDay',
    'mtd',
    'qtd',
    'ytd',
    'prev7Days',
    'prev30Days',
    'prev90Days',
    'prev12Months',
    'prevMonth',
    'prevYear'
];
