/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {SECONDS, MINUTES, HOURS, DAYS} from './DateTimeUtils';
import {flow} from 'lodash';
import {pluralize} from 'hoist/utils/JsUtils';

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

const defaultOptions = {
    allowFuture: false,
    futureSuffix: 'from now',
    pastSuffix: 'ago',
    nowString: null,
    nowEpsilon: 30,
    emptyString: 'never'
};

/**
 * Returns a String relative to the Timestamp provided
 *
 * @param timeStamp, Date Object - Date that will be used as reference for this component
 * @param options, Object
 *          allowFuture, boolean -  Allow dates greater than new Date()
 *          futureSuffix, string - String appended to future timestamps
 *          pastSuffix, string - String appended to past timestamps
 *          nowEpsilon, integer - Number of seconds from initial timeStamp to be considered as `now`.
 *          nowString, string - String used as display property when timeStamp is within nowEpsilon
 *          emptyString, string - String to be used when timeStamp is undefined
 */
export const getString = (timeStamp, options) => {
    const opts = Object.assign({timeStamp}, defaultOptions, options);

    if (!timeStamp) return opt.emptyString;

    // Enhance options with needed info, last function will output result.
    return flow(
        getNow,
        getElapsedTime,
        normalizeAndValidate,
        getMillisAndUnit,
        getSuffix,
        getResult
    )(opts);
};

//----------------------------
// Implementation
//-----------------------------
const getCurrentTime = opts => {
    opts.now = Date.now();
    return opts;
};

const getElapsedTime = opts => {
    const diff = opts.now - opts.timeStamp;
    opts.isFuture = diff < 0;
    opts.elapsedTime: Math.abs(diff);
    return opts;
};

const normalizeElapsedTime = opts => {
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

    // by default the smallest possible unit should be used
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

const getResult = opts => {
    const {isInvalid, elapsedTime, value, unit, useNowString, suffix} = opts;
    if (isInvalid) return '[???]';

    // if elapsedTime was normalized to 0 (smaller than nowEpsilon)
    // then return the nowString if it's present, otherwise return the
    // default FORMAT for seconds.
    if (!elapsedTime && useNowString) return suffix;

    return `${FORMAT_STRINGS[unit].replace('%d', value)} ${suffix}`;
};