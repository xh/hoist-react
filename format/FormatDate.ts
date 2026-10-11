/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {DAYS, isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {defaults, isFinite, isString} from 'lodash';
import moment from 'moment';
import {ReactNode} from 'react';
import {DateLike, PlainObject} from '../core/types/Types';
import {fmtSpan, FormatOptions} from './FormatMisc';
import {createRenderer, type StringFormatter} from './FormatUtils';
import {saveOriginal, throwIfMarkupOptions} from './impl/Utils';

export const DATE_FMT = 'YYYY-MM-DD',
    DATETIME_FMT = 'YYYY-MM-DD h:mma',
    DATETIMESEC_FMT = 'YYYY-MM-DD h:mm:ssa',
    TIME_FMT = 'h:mma',
    MONTH_DAY_FMT = 'MMM D';

const INVALID_DATE = moment(null).format();

/**
 * An object specifying how a date should be formatted.
 */
export interface DateFormatOptions extends FormatOptions<DateLike> {
    /** Display value for null values. */
    nullDisplay?: ReactNode;

    /**
     * A MomentJs format string. Wrap literal text in square brackets to prevent
     * interpretation as format tokens - e.g. `'[today at] h:mma'`.
     */
    fmt?: string;
}

/**
 * Render a date like value with a default format of {@link DATE_FMT}.
 */
export function fmtDate(v: DateLike, opts?: DateFormatOptions | string): ReactNode {
    opts = isString(opts) ? {fmt: opts} : {...opts};
    if (v == null) return opts?.nullDisplay ?? '';

    defaults(opts, {fmt: DATE_FMT, tooltip: null});
    saveOriginal(v, opts);

    let ret: ReactNode =
        v instanceof LocalDate || moment.isMoment(v)
            ? v.format(opts.fmt)
            : moment(v).format(opts.fmt);

    if (ret === INVALID_DATE) {
        ret = '';
    } else if (opts.tooltip) {
        ret = fmtSpan(ret, {
            className: 'xh-title-tip',
            title: opts.tooltip(opts.originalValue),
            asHtml: opts.asHtml
        });
    }

    return ret;
}

/**
 * Render dates with a default format of {@link DATETIME_FMT}.
 */
export function fmtDateTime(v: any, opts?: DateFormatOptions | string): ReactNode {
    opts = isString(opts) ? {fmt: opts} : {...opts};
    defaults(opts, {fmt: DATETIME_FMT});
    saveOriginal(v, opts);

    return fmtDate(v, opts);
}

/**
 * Render dates with a default format of {@link DATETIMESEC_FMT}.
 */
export function fmtDateTimeSec(v: DateLike, opts?: DateFormatOptions | string) {
    opts = isString(opts) ? {fmt: opts} : {...opts};
    defaults(opts, {fmt: DATETIMESEC_FMT});
    saveOriginal(v, opts);

    return fmtDate(v, opts);
}

/**
 * Render dates with a default format of {@link TIME_FMT}.
 */
export function fmtTime(v: DateLike, opts?: DateFormatOptions | string) {
    opts = isString(opts) ? {fmt: opts} : {...opts};
    defaults(opts, {fmt: TIME_FMT});
    saveOriginal(v, opts);

    return fmtDate(v, opts);
}

export interface CompactDateFormatOptions extends FormatOptions<DateLike> {
    /**
     * Format for date matching current day, defaults to 'hh:mma' for dates, 'MMM D' for
     * LocalDates. Wrap literal text in square brackets - e.g. `'[today]'` or `'[today at] h:mma'`.
     */
    sameDayFmt?: string;

    /**
     * Format for dates within the number of months specified by the distantThreshold, defaults
     * to 'MMM D'. Wrap literal text in square brackets - e.g. `'[recent]'`.
     */
    nearFmt?: string;

    /**
     * Format for dates beyond number of months specified by the distantThreshold, defaults to
     * 'YYYY-MM-DD'. Wrap literal text in square brackets - e.g. `'[older]'`.
     */
    distantFmt?: string;

    /** Number of months away from the current month to be considered 'recent' or 'near'. */
    distantThreshold?: number;
}

/**
 * Render dates formatted based on distance in time from current day.
 */
export function fmtCompactDate(v: DateLike, opts?: CompactDateFormatOptions) {
    const {
        sameDayFmt = isLocalDate(v) ? MONTH_DAY_FMT : TIME_FMT,
        nearFmt = MONTH_DAY_FMT,
        distantFmt = DATE_FMT,
        distantThreshold = 6,
        nullDisplay,
        tooltip = null,
        asHtml = false,
        originalValue = v
    }: CompactDateFormatOptions = opts ?? {};
    if (v instanceof LocalDate) v = v.date;

    const now = moment(),
        today = fmtDate(new Date()),
        valueDay = fmtDate(v),
        recentPast = now.clone().subtract(distantThreshold, 'months').endOf('month'),
        nearFuture = now.clone().add(distantThreshold, 'months').startOf('month'),
        dateOpts: DateFormatOptions = {nullDisplay, tooltip, originalValue, asHtml};

    if (today === valueDay) {
        dateOpts.fmt = sameDayFmt;
    } else if (moment(v).isBetween(recentPast, nearFuture)) {
        dateOpts.fmt = nearFmt;
    } else {
        dateOpts.fmt = distantFmt;
    }

    return fmtDate(v, dateOpts);
}

export interface TimestampReplacerConfig {
    /**
     * Suffixes used to identify keys that may hold timestamps.
     * Defaults to ['time', 'date', 'timestamp']
     */
    suffixes?: string[];

    /**
     * Format for replaced timestamp.
     * Defaults to 'MMM DD HH:mm:ss.SSS'
     */
    format?: string;
}

/**
 * Replace timestamps in an Object with formatted strings.
 */
export function withFormattedTimestamps(
    obj: PlainObject,
    config: TimestampReplacerConfig = {}
): PlainObject {
    return JSON.parse(JSON.stringify(obj, timestampReplacer(config)));
}

/**
 * Create a replacer, suitable for JSON.stringify, that will replace timestamps with
 * formatted strings.
 */
export function timestampReplacer(
    config: TimestampReplacerConfig = {}
): (k: string, v: any) => any {
    const suffixes = config.suffixes ?? ['time', 'date', 'timestamp'],
        fmt = config.format ?? 'MMM DD HH:mm:ss.SSS';
    return (k: string, v: any) => {
        return suffixes.some(s => k.toLowerCase().endsWith(s.toLowerCase())) &&
            isFinite(v) &&
            v > Date.now() - 25 * 365 * DAYS // heuristic to avoid catching smaller ms ranges
            ? fmtDateTime(v, {fmt})
            : v;
    };
}

export const dateRenderer = createRenderer(fmtDate),
    dateTimeRenderer = createRenderer(fmtDateTime),
    dateTimeSecRenderer = createRenderer(fmtDateTimeSec),
    timeRenderer = createRenderer(fmtTime),
    compactDateRenderer = createRenderer(fmtCompactDate);

/**
 * Options for the string-returning date formatters - {@link dateFormatter} and friends.
 *
 * As {@link DateFormatOptions}, less the options that need markup, which a formatter cannot
 * return. Those are typed `never`, so passing one fails to compile, and the factories throw if an
 * untyped caller passes one anyway.
 */
export type DateFormatterOptions = WithoutMarkup<DateFormatOptions>;

/** As {@link DateFormatterOptions}, for {@link compactDateFormatter}. */
export type CompactDateFormatterOptions = WithoutMarkup<CompactDateFormatOptions>;

type WithoutMarkup<O> = Omit<O, 'tooltip' | 'asHtml' | 'nullDisplay' | 'originalValue'> & {
    /** Display value for null values. */
    nullDisplay?: string;

    /** Not supported - set `Column.tooltip` instead. */
    tooltip?: never;

    /** Not supported - a formatter always returns plain text. */
    asHtml?: never;
};

/**
 * String-returning counterparts of {@link dateRenderer} and friends, for `Column.formatter`.
 * Each returns a formatter whose output ag-Grid writes into the cell as text.
 */
export const dateFormatter = createDateFormatter<DateFormatterOptions | string>(fmtDate),
    dateTimeFormatter = createDateFormatter<DateFormatterOptions | string>(fmtDateTime),
    dateTimeSecFormatter = createDateFormatter<DateFormatterOptions | string>(fmtDateTimeSec),
    timeFormatter = createDateFormatter<DateFormatterOptions | string>(fmtTime),
    compactDateFormatter = createDateFormatter<CompactDateFormatterOptions>(fmtCompactDate);

function createDateFormatter<C extends PlainObject | string>(
    fmt: (v: DateLike, opts?: any) => ReactNode
): (opts?: C) => StringFormatter<DateLike> {
    return opts => {
        const fmtOpts = isString(opts) ? {fmt: opts} : {...(opts as PlainObject)};
        throwIfMarkupOptions(fmtOpts, ['tooltip', 'asHtml'], ['nullDisplay']);
        return v => fmt(v, fmtOpts) as string;
    };
}
