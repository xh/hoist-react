/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {SECONDS, MINUTES, HOURS, DAYS} from './DateTimeUtils';
import {compose} from './Compose';

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
    const opt = Object.assign(defaultOptions, options);

    if (!timeStamp) return opt.emptyString;

    return compose(
        getCurrentTime,
        getDiffFromInput(timeStamp),
        adjustDiff(opt),
        getUnitAndValue,
        getSuffix(opt),
        generateStringByDateRange
    )();
};

const getCurrentTime = () => new Date();

const getDiffFromInput = timeStamp => {
    return now => {
        const diff = now - timeStamp;
        return {
            isFuture: diff < 0,
            diff: Math.abs(diff)
        };
    };
};

const adjustDiff = options =>
    config => {
        const {allowFuture, nowEpsilon} = options;

        if (config.diff < nowEpsilon * SECONDS) {
            config.diff = 0;
        } else if (!allowFuture && config.isFuture) {
            config.isInvalid = true;
            console.warn(`Unexpected future date provided for timestamp: ${config.diff}ms in the future.`);
        }

        return config;
    };

const getUnitAndValue = config => {
    const {isInvalid, diff} = config;
    if (isInvalid || !diff) return this;

    const types = [
        {name: 'seconds',  formula: v => v / SECONDS},
        {name: 'minute',   formula: v => v / MINUTES},
        {name: 'hour',     formula: v => v / HOURS},
        {name: 'day',      formula: v => v / DAYS},
        {name: 'month',    formula: v => v / (DAYS * 30)},
        {name: 'year',    formula: v => v / (DAYS * 365)}
    ];

    types.forEach(type => {
        const val = type.formula(diff);
        if (val >= 1) {
            config.value = parseInt(val);
            config.unit = `${type.name}${type.name !== 'seconds' && val >=2 ? 's' : ''}`;
        }
    });

    return config;
};

const getSuffix = options =>
    config => {
        const {isInvalid, diff, isFuture} = config;
        if (isInvalid) return config;

        if (!diff) {
            config._suffix = options.nowString || '';
        } else {
            config.suffix = options[isFuture ? 'futureSuffix' : 'pastSuffix'];
        }

        return config;
    };

const generateStringByDateRange = config => {
    const {isInvalid, diff, unit, value, suffix} = config;
    if (isInvalid) return '[???]';
    if (!diff || unit === 'seconds') {
        if (!diff && suffix) return suffix;
        return FORMAT_STRINGS.seconds;
    }

    return `${FORMAT_STRINGS[unit].replace('%d', value)} ${suffix}`;
};