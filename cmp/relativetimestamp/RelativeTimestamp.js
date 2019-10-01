/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {box, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, managed, useLocalModel, XH} from '@xh/hoist/core';
import {fmtDateTime} from '@xh/hoist/format';
import {action, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {DAYS, HOURS, MINUTES, SECONDS} from '@xh/hoist/utils/datetime';
import {pluralize, withDefault} from '@xh/hoist/utils/js';
import {flow} from 'lodash';
import PT from 'prop-types';

/**
 * A component to display the approximate amount of time between a given timestamp and now in a
 * friendly, human readable format (e.g. '6 minutes ago' or 'two hours from now').
 *
 * Automatically updates on a regular interval to stay current.
 */
export const [RelativeTimestamp, relativeTimestamp] = hoistCmp.withFactory({
    displayName: 'RelativeTimestamp',
    className: 'xh-relative-timestamp',

    render({model, timestamp, bind, options, ...props}) {
        const impl = useLocalModel(LocalModel);

        timestamp = withDefault(timestamp, (model && bind ? model[bind] : null));

        impl.setData(timestamp, options);

        return box({
            ...props,
            item: span({
                className: 'xh-title-tip',
                item: impl.display,
                title: fmtDateTime(timestamp)
            })
        });
    }
});
RelativeTimestamp.propTypes = {
    /**
     * Date or milliseconds representing the starting / reference time.
     * See also `bind` as an alternative.
     */
    timestamp: PT.oneOfType([PT.instanceOf(Date), PT.number]),

    /**
     * Property on context model containing timestamp.
     * Specify as an alternative to direct `timestamp` prop (and minimize parent re-renders).
     */
    bind: PT.string,

    /** @see getRelativeTimestamp options. */
    options: PT.object
};

@HoistModel
class LocalModel {

    options;
    timestamp;

    @observable display = '';

    @managed
    timer = Timer.create({
        runFn: () => this.refreshDisplay(),
        interval: 10 * SECONDS
    });

    setData(timestamp, options) {
        this.timestamp = timestamp;
        this.options = options;
        this.refreshDisplay();
    }

    @action
    refreshDisplay() {
        this.display = getRelativeTimestamp(this.timestamp, this.options);
    }

}


/**
 * Returns a string describing the approximate amount of time between a given timestamp and the
 * present moment in a friendly, human readable format.
 *
 * @param {(Date|int)} timestamp - Date or milliseconds representing the starting / reference time.
 * @param {Object} [options]
 * @param {boolean} [options.allowFuture] - Allow dates greater than Date.now().
 * @param {boolean} [options.short] - Use shorter timestamp text, default true for mobile clients.
 * @param {string} [options.prefix] - Label preceding timestamp.
 * @param {string} [options.futureSuffix] - appended to future timestamps.
 * @param {string} [options.pastSuffix] - appended to past timestamps.
 * @param {string} [options.nowString] - string to return when timestamp is within `nowEpsilon`.
 * @param {number} [options.nowEpsilon] - threshold interval (in seconds) for `nowString`.
 * @param {string} [options.emptyResult] - string to return when timestamp is empty/falsey.
 */
export function getRelativeTimestamp(timestamp, options) {
    const defaultOptions = {
            allowFuture: false,
            short: XH.isMobile,
            futureSuffix: 'from now',
            pastSuffix: 'ago',
            nowString: null,
            nowEpsilon: 30,
            emptyResult: ''
        },
        opts = Object.assign({timestamp}, defaultOptions, options);

    if (!timestamp) return opts.emptyResult;

    // Enhance options with needed info, last function will output result.
    return flow(
        getNow,
        getElapsedTime,
        normalizeAndValidate,
        getMillisAndUnit,
        getPrefix,
        getSuffix,
        getResult
    )(opts);
}


//------------------------
// Implementation
//------------------------
const getNow = opts => ({...opts, now: Date.now()});

const getElapsedTime = opts => {
    const diff = opts.now - opts.timestamp;
    opts.isFuture = diff < 0;
    opts.elapsedTime = Math.abs(diff);
    return opts;
};

const normalizeAndValidate = opts => {
    const {isFuture, allowFuture, nowEpsilon, elapsedTime} = opts;
    if (elapsedTime < nowEpsilon * SECONDS) {
        opts.elapsedTime = 0;
    } else if (!allowFuture && isFuture) {
        opts.isInvalid = true;
        console.warn(`Unexpected future date provided for timestamp: ${elapsedTime}ms in the future.`);
    }

    return opts;
};

const getMillisAndUnit = opts => {
    const {isInvalid, elapsedTime} = opts;
    // By default the smallest possible unit should be used
    opts.unit = 'seconds';
    opts.millis = 0;

    if (isInvalid || !elapsedTime) return opts;

    const types = [
        {name: 'seconds',  formula: v => v / SECONDS},
        {name: 'minute',   formula: v => v / MINUTES},
        {name: 'hour',     formula: v => v / HOURS},
        {name: 'day',      formula: v => v / DAYS},
        {name: 'month',    formula: v => v / (DAYS * 30)},
        {name: 'year',     formula: v => v / (DAYS * 365)}
    ];

    types.forEach(type => {
        const val = type.formula(elapsedTime);

        if (val >= 1) {
            opts.millis = parseInt(val, 10);
            opts.unit = type.name;

            if (opts.unit !== 'seconds') {
                opts.unit = pluralize(opts.unit, opts.millis);
            }
        }
    });

    return opts;
};

const getSuffix = opts => {
    const {isInvalid, elapsedTime, isFuture, nowString} = opts;
    if (isInvalid) return opts;

    if (!elapsedTime && nowString) {
        opts.suffix = nowString;
        opts.useNowString = true;
    } else {
        opts.suffix = opts[isFuture ? 'futureSuffix' : 'pastSuffix'];
    }

    return opts;
};

const getPrefix  = opts => {
    const {isInvalid, prefix} = opts;
    if (isInvalid) return opts;
    opts.prefix =  prefix ? prefix + ' ' : '';
    return opts;
};

const getResult = opts => {
    const {isInvalid, elapsedTime, millis, unit, useNowString, prefix, suffix, short} = opts;
    if (isInvalid) return '[???]';

    // if elapsedTime was normalized to 0 (smaller than nowEpsilon) then return the nowString
    // if specified, otherwise return the default FORMAT for seconds.
    if (!elapsedTime && useNowString) return suffix;

    const fmtString = short ? SHORT_FORMAT_STRINGS[unit] : FORMAT_STRINGS[unit];
    return `${prefix}${fmtString.replace('%d', millis)} ${suffix}`;
};

const FORMAT_STRINGS = {
    seconds: '<1 minute',
    minute: '1 minute',
    minutes: '%d minutes',
    hour: 'about an hour',
    hours: 'about %d hours',
    day: 'a day',
    days: '%d days',
    month: 'about a month',
    months: '%d months',
    year: 'about a year',
    years: '%d years'
};

const SHORT_FORMAT_STRINGS = {
    seconds: '<1 min',
    minute: '1 min',
    minutes: '%d mins',
    hour: '~1 hour',
    hours: '~%d hours',
    day: 'a day',
    days: '%d days',
    month: 'a month',
    months: '%d months',
    year: 'a year',
    years: '%d years'
};
