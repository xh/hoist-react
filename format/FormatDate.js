/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {defaults, isString} from 'lodash';
import moment from 'moment';

import {saveOriginal, createRenderer} from './FormatUtils';
import {fmtSpan} from './FormatMisc';

const DATE_FMT = 'YYYY-MM-DD',
    DATETIME_FMT = 'YYYY-MM-DD h:mma',
    TIME_FMT = 'h:mma',
    MONTH_DAY_FMT = 'MMM D';

/**
 * Render dates and times with specified format
 *
 * @param {*} [v] - a date value to format, can be any value MomentJs can parse
 *                  see: https://momentjs.com/docs/#/parsing/ for more info
 *
 * @param {Object|string} [opts] - a MomentJs format string or an options object
 * @param {string} [opts.fmt] - a MomentJs format string
 * @param {function} [opts.tipFn] - use to place formatted date in span with title property set to returned string
 *                                  will be passed the originalValue param
 * @param {*} [opts.originalValue] - used to retain an unaltered reference to the original value to be formatted
 *                                   Not typically used by applications.
 */
export function fmtDate(v, opts = {}) {
    if (isString(v)) return v;
    if (isString(opts)) opts = {fmt: opts};
    defaults(opts, {fmt: DATE_FMT, tipFn: null});
    saveOriginal(v, opts);

    let ret = moment(v).format(opts.fmt);

    if (opts.tipFn) {
        ret = fmtSpan(ret, {cls: 'xh-title-tip', title: opts.tipFn(opts.originalValue)});
    }

    return ret;
}

export function fmtDateTime(v, opts = {}) {
    if (isString(opts)) opts = {fmt: opts};
    defaults(opts, {fmt: DATETIME_FMT});
    saveOriginal(v, opts);

    return fmtDate(v, opts);
}


export function fmtTime(v, opts = {}) {
    if (isString(opts)) opts = {fmt: opts};
    defaults(opts, {fmt: TIME_FMT});
    saveOriginal(v, opts);

    return fmtDate(v, opts);
}

/**
 * Render dates formatted based on distance in time from current day
 *
 * @param v - date to format
 * @param opts - MomentJs format string options, may include:
 *      @param sameDayFmt - format for dates matching current day, defaults to 'hh:mma'
 *      @param nearFmt - format for dates within the number of months determined by the recentThreshold, defaults to 'MMM D'
 *      @param distantFmt - format for dates outside of the number of months specified by the recentThreshold, defaults to 'YYYY-MM-DD'
 *      @param distantThreshold - int used to determined the number of months away from the current month to be considered 'recent'
 *      @param tipFn - function, use to place formatted date in span with title property set to string returned by this function
 *      @param originalValue - used to retain an unaltered reference to the original value to be formatted
 *                             Not typically used by applications.
 *
 * Note: Moments are mutable. Calling any of the manipulation methods will change the original moment.
 */
export function fmtCompactDate(v, {
    sameDayFmt = TIME_FMT,
    nearFmt = MONTH_DAY_FMT,
    distantFmt = DATE_FMT,
    distantThreshold = 6,
    tipFn = null,
    originalValue = v
} = {}) {

    const now = moment(),
        today = fmtDate(new Date()),
        valueDay = fmtDate(v),
        recentPast = now.clone().subtract(distantThreshold, 'months').endOf('month'),
        nearFuture = now.clone().add(distantThreshold, 'months').date(1),
        dateOpts = {tipFn: tipFn, originalValue: originalValue};

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
    timeRenderer = createRenderer(fmtTime),
    compactDateRenderer = createRenderer(fmtCompactDate);