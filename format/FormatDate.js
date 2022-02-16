/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {isLocalDate} from '@xh/hoist/utils/datetime';
import {defaults, isString} from 'lodash';
import moment from 'moment';
import {fmtSpan} from './FormatMisc';
import {asElementDeprecationWarning, createRenderer, saveOriginal} from './FormatUtils';

export const DATE_FMT = 'YYYY-MM-DD',
    DATETIME_FMT = 'YYYY-MM-DD h:mma',
    DATETIMESEC_FMT = 'YYYY-MM-DD h:mm:ssa',
    TIME_FMT = 'h:mma',
    MONTH_DAY_FMT = 'MMM D';

const INVALID_DATE = moment(null).format();

/**
 * Render dates and times with specified format
 *
 * @param {*} v - a date value to format, can be any value MomentJs can parse or a LocalDate.
 *      @see {@link https://momentjs.com/docs/#/parsing/|MomentJS Docs}
 * @param {(Object|string)} [opts] - a MomentJs format string or an options object.
 * @param {string} [opts.nullDisplay] - display string for null values.
 * @param {string} [opts.fmt] - a MomentJs format string.
 * @param {function} [opts.tooltip] - function to generate a tooltip string,
 *      passed the original value to be formatted.
 * @param {boolean} [opts.asHtml] - return an HTML string rather than a React element.
 * @param {*} [opts.originalValue] - holds the unaltered original value to be formatted.
 *      Not typically used by applications.
 */
export function fmtDate(v, opts) {
    asElementDeprecationWarning(opts);
    if (v == null) return opts?.nullDisplay ?? '';
    opts = isString(opts) ? {fmt: opts} : {...opts};

    defaults(opts, {fmt: DATE_FMT, tooltip: null});
    saveOriginal(v, opts);

    let ret = isLocalDate(v) || moment.isMoment(v) ?
        v.format(opts.fmt) :
        moment(v).format(opts.fmt);

    if (ret === INVALID_DATE) {
        ret = '';
    } else if (opts.tooltip) {
        ret = fmtSpan(ret, {className: 'xh-title-tip', title: opts.tooltip(opts.originalValue), asHtml: opts.asHtml});
    }

    return opts.asHtml ? ret : span(ret);
}

export function fmtDateTime(v, opts) {
    opts = isString(opts) ? {fmt: opts} : {...opts};
    defaults(opts, {fmt: DATETIME_FMT});
    saveOriginal(v, opts);

    return fmtDate(v, opts);
}

export function fmtDateTimeSec(v, opts) {
    opts = isString(opts) ? {fmt: opts} : {...opts};
    defaults(opts, {fmt: DATETIMESEC_FMT});
    saveOriginal(v, opts);

    return fmtDate(v, opts);
}

export function fmtTime(v, opts) {
    opts = isString(opts) ? {fmt: opts} : {...opts};
    defaults(opts, {fmt: TIME_FMT});
    saveOriginal(v, opts);

    return fmtDate(v, opts);
}

/**
 * Render dates formatted based on distance in time from current day
 *
 * @param {*} v - a date value to format, can be any value MomentJs can parse, or a LocalDate.
 *      @see {@link https://momentjs.com/docs/#/parsing/|MomentJS Docs}
 * @param {Object} [opts]
 * @param {string} [opts.sameDayFmt] - format for dates matching current day, defaults to 'hh:mma' for
 *      dates, 'MMM D' for LocalDates.
 * @param {string} [opts.nearFmt] - format for dates within the number of months specified by the
 *      distantThreshold, defaults to 'MMM D'.
 * @param {string} [opts.distantFmt] - format for dates > number of months specified by the
 *      distantThreshold, defaults to 'YYYY-MM-DD'.
 * @param {number} [opts.distantThreshold] - number of months away from the current month
 *      to be considered 'recent' or 'near'.
 * @param {function} [opts.tooltip] - function to generate a tooltip string,
 *      passed the original value to be formatted.
 * @param {boolean} [opts.asHtml] - return an HTML string rather than a React element.
 * @param {*} [opts.originalValue] - holds the unaltered original value to be formatted.
 *      Not typically used by applications.
 *
 * Note: Moments are mutable. Calling any of the manipulation methods will change the original moment.
 */
export function fmtCompactDate(v, {
    sameDayFmt = isLocalDate(v) ? MONTH_DAY_FMT : TIME_FMT,
    nearFmt = MONTH_DAY_FMT,
    distantFmt = DATE_FMT,
    distantThreshold = 6,
    tooltip = null,
    asHtml = false,
    originalValue = v
} = {}) {
    if (isLocalDate(v)) v = v.date;

    const now = moment(),
        today = fmtDate(new Date()),
        valueDay = fmtDate(v),
        recentPast = now.clone().subtract(distantThreshold, 'months').endOf('month'),
        nearFuture = now.clone().add(distantThreshold, 'months').date(1),
        dateOpts = {tooltip, originalValue, asHtml};

    if (today === valueDay) {
        dateOpts.fmt = sameDayFmt;
    } else if (moment(v).isBetween(recentPast, nearFuture)) {
        dateOpts.fmt = nearFmt;
    } else {
        dateOpts.fmt = distantFmt;
    }

    return fmtDate(v, dateOpts);
}

export const dateRenderer = createRenderer(fmtDate),
    dateTimeRenderer = createRenderer(fmtDateTime),
    dateTimeSecRenderer = createRenderer(fmtDateTimeSec),
    timeRenderer = createRenderer(fmtTime),
    compactDateRenderer = createRenderer(fmtCompactDate);
