/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {LocalDate} from '@xh/hoist/utils/datetime';
import type {
    DateRangeContext,
    DateRangePreset,
    DateRangePresetToken,
    DateRangeCalendarUnit
} from './Types';

type Resolver = DateRangePreset['resolve'];
type PriorResolver = DateRangePreset['resolvePrior'];

/** From the start of the unit containing the anchor date, through the anchor date. */
const toDate =
    (unit: DateRangeCalendarUnit): Resolver =>
    ({anchorDate}) => ({start: anchorDate.startOf(unit), end: anchorDate});

/** A rolling window of `n` days ending on the anchor date. */
const lastDays =
    (n: number): Resolver =>
    ({anchorDate}) => ({start: anchorDate.subtract(n - 1, 'days'), end: anchorDate});

/** A rolling window of `n` months ending on the anchor date. */
const lastMonths =
    (n: number): Resolver =>
    ({anchorDate}) => ({start: anchorDate.subtract(n, 'months').nextDay(), end: anchorDate});

/**
 * The same elapsed span as period-to-date, one unit earlier - e.g. prior MTD on the 12th is the
 * 1st through 12th of last month.
 */
const priorToDate =
    (unit: DateRangeCalendarUnit): Resolver =>
    ({anchorDate}) => ({
        start: anchorDate.startOf(unit).subtract(1, unit),
        end: anchorDate.subtract(1, unit)
    });

/** The nearest business day strictly before `date`, per the context's `isBusinessDay`. */
const previousBusinessDay = (date: LocalDate, ctx: DateRangeContext): LocalDate => {
    let ret = date.previousDay();
    // Bounded walk - guards against an `isBusinessDay` that never returns true.
    for (let i = 0; i < 366 && !ctx.isBusinessDay(ret); i++) ret = ret.previousDay();
    return ret;
};

/** The full calendar unit before the one containing the anchor date. */
const previousUnit =
    (unit: DateRangeCalendarUnit): Resolver =>
    ctx => {
        const start = previousUnitStart(ctx, unit);
        return {start, end: start.endOf(unit)};
    };

const previousUnitStart = (
    {anchorDate}: DateRangeContext,
    unit: DateRangeCalendarUnit
): LocalDate => anchorDate.startOf(unit).subtract(1, unit);

/** The current range shifted back `n` units - a prior of equal calendar shape. */
const shiftedPrior =
    (unit: DateRangeCalendarUnit, n: number = 1): PriorResolver =>
    ({start, end}) => ({start: start.subtract(n, unit), end: end.subtract(n, unit)});

/** The full calendar unit before a current range that is itself a full unit. */
const previousUnitPrior =
    (unit: DateRangeCalendarUnit): PriorResolver =>
    ({start}) => {
        const priorStart = start.subtract(1, unit);
        return {start: priorStart, end: priorStart.endOf(unit)};
    };

/**
 * Presets shipped with Hoist, keyed by token. Offer any subset (in any order) via the `presets`
 * config of {@link DateRangePickerModel}, alongside any app-defined {@link DateRangePreset}s.
 *
 * Period-to-date presets (`wtd`, `mtd`, `qtd`, `ytd`) resolve their prior range as the same span
 * one unit earlier - e.g. MTD on the 12th compares against the 1st through 12th of the prior
 * month. Previous-unit presets (`lastWeek`, `lastMonth`, ...) compare against the unit before.
 * Rolling windows compare against the window of equal length immediately preceding them.
 *
 * Prior period-to-date presets (`priorMtd`, `priorQtd`, `priorYtd`) select the comparison period
 * itself - the same elapsed span one unit earlier, as also exposed by `priorRange` for the
 * current-period presets. `lastBusinessDay` walks back from the anchor date over non-business days
 * per the context's `isBusinessDay` - weekdays by default, or a model-supplied calendar.
 *
 * A preset that names a specific period reads the same as a pick of that period on the Months &
 * Years tab - `lastMonth` labels as e.g. `Aug 2026` and `lastYear` as `2025` - so the trigger
 * describes the period, whichever way it was chosen. The underlying values stay distinct: a preset
 * re-resolves against the anchor date as time passes, where a pinned month or year does not.
 */
export const dateRangePresets: Record<DateRangePresetToken, DateRangePreset> = {
    today: {
        token: 'today',
        label: 'Today',
        resolve: ({anchorDate}) => ({start: anchorDate, end: anchorDate}),
        resolvePrior: shiftedPrior('days')
    },
    yesterday: {
        token: 'yesterday',
        label: 'Yesterday',
        resolve: ({anchorDate}) => {
            const day = anchorDate.previousDay();
            return {start: day, end: day};
        },
        resolvePrior: shiftedPrior('days')
    },
    wtd: {
        token: 'wtd',
        label: 'WTD',
        name: 'Week to Date',
        resolve: toDate('weeks'),
        resolvePrior: shiftedPrior('weeks')
    },
    mtd: {
        token: 'mtd',
        label: 'MTD',
        name: 'Month to Date',
        resolve: toDate('months'),
        resolvePrior: shiftedPrior('months')
    },
    qtd: {
        token: 'qtd',
        label: 'QTD',
        name: 'Quarter to Date',
        resolve: toDate('quarters'),
        resolvePrior: shiftedPrior('quarters')
    },
    ytd: {
        token: 'ytd',
        label: 'YTD',
        name: 'Year to Date',
        resolve: toDate('years'),
        resolvePrior: shiftedPrior('years')
    },
    last7Days: {token: 'last7Days', label: 'Last 7 Days', resolve: lastDays(7)},
    last30Days: {token: 'last30Days', label: 'Last 30 Days', resolve: lastDays(30)},
    last90Days: {token: 'last90Days', label: 'Last 90 Days', resolve: lastDays(90)},
    last3Months: {
        token: 'last3Months',
        label: 'Last 3 Months',
        resolve: lastMonths(3),
        resolvePrior: shiftedPrior('months', 3)
    },
    last6Months: {
        token: 'last6Months',
        label: 'Last 6 Months',
        resolve: lastMonths(6),
        resolvePrior: shiftedPrior('months', 6)
    },
    last12Months: {
        token: 'last12Months',
        label: 'Last 12 Months',
        resolve: lastMonths(12),
        resolvePrior: shiftedPrior('years')
    },
    lastWeek: {
        token: 'lastWeek',
        label: 'Last Week',
        resolve: previousUnit('weeks'),
        resolvePrior: previousUnitPrior('weeks')
    },
    lastMonth: {
        token: 'lastMonth',
        label: ctx => previousUnitStart(ctx, 'months').format('MMM YYYY'),
        name: ctx => `Last Month (${previousUnitStart(ctx, 'months').format('MMM YYYY')})`,
        resolve: previousUnit('months'),
        resolvePrior: previousUnitPrior('months')
    },
    lastQuarter: {
        token: 'lastQuarter',
        label: ctx => previousUnitStart(ctx, 'quarters').format('[Q]Q YYYY'),
        name: ctx => `Last Quarter (${previousUnitStart(ctx, 'quarters').format('[Q]Q YYYY')})`,
        resolve: previousUnit('quarters'),
        resolvePrior: previousUnitPrior('quarters')
    },
    lastYear: {
        token: 'lastYear',
        label: ctx => previousUnitStart(ctx, 'years').format('YYYY'),
        name: ctx => `Last Year (${previousUnitStart(ctx, 'years').format('YYYY')})`,
        resolve: previousUnit('years'),
        resolvePrior: previousUnitPrior('years')
    },
    lastBusinessDay: {
        token: 'lastBusinessDay',
        label: 'Last Business Day',
        resolve: ctx => {
            const day = previousBusinessDay(ctx.anchorDate, ctx);
            return {start: day, end: day};
        },
        resolvePrior: ({start}, ctx) => {
            const day = previousBusinessDay(start, ctx);
            return {start: day, end: day};
        }
    },
    priorMtd: {
        token: 'priorMtd',
        label: 'Prior MTD',
        name: 'Prior Month to Date',
        resolve: priorToDate('months'),
        resolvePrior: shiftedPrior('months')
    },
    priorQtd: {
        token: 'priorQtd',
        label: 'Prior QTD',
        name: 'Prior Quarter to Date',
        resolve: priorToDate('quarters'),
        resolvePrior: shiftedPrior('quarters')
    },
    priorYtd: {
        token: 'priorYtd',
        label: 'Prior YTD',
        name: 'Prior Year to Date',
        resolve: priorToDate('years'),
        resolvePrior: shiftedPrior('years')
    },
    all: {
        token: 'all',
        label: 'All',
        name: 'All Dates',
        // Everything selectable - unbounded at the start unless the model sets a `minDate`.
        resolve: ({minDate, maxDate}) => ({start: minDate, end: maxDate}),
        resolvePrior: () => null
    }
};

/** Tokens of the presets shipped with Hoist, in a sensible display order. */
export const DATE_RANGE_PRESET_TOKENS = Object.keys(dateRangePresets) as DateRangePresetToken[];

/** Presets offered by {@link DateRangePickerModel} when none are configured. */
export const DEFAULT_DATE_RANGE_PRESETS: DateRangePresetToken[] = [
    'today',
    'mtd',
    'qtd',
    'ytd',
    'last7Days',
    'last30Days',
    'last90Days',
    'last12Months',
    'lastMonth',
    'lastYear'
];
