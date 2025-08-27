/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {DAYS, isLocalDate, LocalDate} from '@xh/hoist/utils/datetime';
import {defaults, isFinite, isString} from 'lodash';
import moment from 'moment';
import {ReactNode} from 'react';
import {DateLike, PlainObject} from '../core/types/Types';
import {fmtSpan, FormatOptions} from './FormatMisc';
import {createRenderer} from './FormatUtils';
import {saveOriginal} from './impl/Utils';

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

    /** A MomentJs format string. */
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
     * Format for date matching current day, defaults to 'hh:mma' for dates, 'MMM D' for LocalDates.
     */
    sameDayFmt?: string;

    /**
     *  Format for dates within the number of months specified by the distantThreshold, defaults
     *  to 'MMM D'.
     */
    nearFmt?: string;

    /**
     * Format for dates beyond number of months specified by the distantThreshold, defaults to
     * 'YYYY-MM-DD'.
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
        tooltip = null,
        asHtml = false,
        originalValue = v
    }: CompactDateFormatOptions = opts ?? {};
    if (v instanceof LocalDate) v = v.date;

    const now = moment(),
        today = fmtDate(new Date()),
        valueDay = fmtDate(v),
        recentPast = now.clone().subtract(distantThreshold, 'months').endOf('month'),
        nearFuture = now.clone().add(distantThreshold, 'months').date(1),
        dateOpts: DateFormatOptions = {tooltip, originalValue, asHtml};

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
        fmt = 'MMM DD HH:mm:ss.SSS';
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
