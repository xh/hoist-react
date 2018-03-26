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
    const opt = Object.assign(defaultOptions, options);

    if (!timeStamp) return opt.emptyString;

    return flow(
        getCurrentTime,
        getElapsedTime(timeStamp),
        normalizeElapsedTime,
        formatElapsedTime,
        getSuffix,
        generateStringByDateRange
    )(opt);
};

const getCurrentTime = options => ({ currentDate: new Date(), options});

const getElapsedTime = timeStamp =>
    config => {
        const diff = config.currentDate - timeStamp;
        return Object.assign(config, {
            isFuture: diff < 0,
            elapsedTime: Math.abs(diff)
        });
    };

const normalizeElapsedTime = config => {
    const {isFuture, options} = config,
        {allowFuture, nowEpsilon} = options;

    if (config.elapsedTime < nowEpsilon * SECONDS) {
        config.elapsedTime = 0;
    } else if (!allowFuture && isFuture) {
        config.isInvalid = true;
        console.warn(`Unexpected future date provided for timestamp: ${config.elapsedTime}ms in the future.`);
    }

    return config;
};

const formatElapsedTime = config => {
    const {isInvalid, elapsedTime} = config;

    // by default the smallest possible unit should be used
    config.unit = 'seconds';
    config.value = 0;

    if (isInvalid || !elapsedTime) return config;

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
            config.value = parseInt(val, 10);
            config.unit = type.name;

            if (config.unit !== 'seconds') {
                config.unit = pluralize(config.unit, config.value);
            }
        }
    });

    return config;
};

const getSuffix = config => {
    const {isInvalid, elapsedTime, isFuture, options} = config;
    if (isInvalid) return config;

    if (!elapsedTime && options.nowString) {
        config.suffix = options.nowString;
        config.useNowString = true;
    } else {
        config.suffix = options[isFuture ? 'futureSuffix' : 'pastSuffix'];
    }

    return config;
};

const generateStringByDateRange = config => {
    const {isInvalid, elapsedTime, value, unit, useNowString, suffix} = config;
    if (isInvalid) return '[???]';

    // if elapsedTime was normalized to 0 (smaller than nowEpsilon)
    // then return the nowString if it's present, otherwise return the
    // default FORMAT for seconds.
    if (!elapsedTime && useNowString) return suffix;

    return `${FORMAT_STRINGS[unit].replace('%d', value)} ${suffix}`;
};