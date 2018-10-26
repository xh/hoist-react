/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {HoistComponent, LayoutSupport, elemFactory} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {box} from '@xh/hoist/cmp/layout';
import {span} from '@xh/hoist/cmp/layout';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS, MINUTES, HOURS, DAYS} from '@xh/hoist/utils/datetime';
import {fmtDateTime} from '@xh/hoist/format';
import {flow} from 'lodash';
import {pluralize} from '@xh/hoist/utils/js';

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
    emptyResult: ''
};

/**
 * A RelativeTimestamp component
 *
 * Displays the approximate amount of time between a given timestamp and the present moment
 * in a friendly, human readable form. Automatically updates on a regular interval to stay current.
 */
@HoistComponent
@LayoutSupport
export class RelativeTimestamp extends Component {

    static propTypes = {
        /** Date object that will be used as reference, can also be specified in milliseconds*/
        timestamp: PT.oneOfType([PT.instanceOf(Date), PT.number]),

        /** @see getRelativeTimestamp options */
        options: PT.object
    };

    baseClassName = 'xh-relative-timestamp';

    @observable relativeTimeString;
    timer = null;

    render() {
        const {relativeTimeString, props} = this;
        return box({
            ...this.getLayoutProps(),
            className: this.getClassName(),
            item: span({
                className: 'xh-title-tip',
                item: relativeTimeString,
                title: fmtDateTime(props.timestamp)
            })
        });
    }

    refreshLabel = () => {
        this.updateRelativeTimeString(this.props);
    }

    @action
    updateRelativeTimeString(props) {
        const {timestamp, options} = props;
        this.relativeTimeString = getRelativeTimestamp(timestamp, options);
    }

    componentDidMount() {
        this.timer = new Timer({
            runFn: this.refreshLabel,
            interval: 10 * SECONDS
        });
    }

    componentWillUnmount() {
        this.timer.cancel();
    }

    componentWillReceiveProps(nextProps) {
        this.updateRelativeTimeString(nextProps);
    }
}

export const relativeTimestamp = elemFactory(RelativeTimestamp);

/**
 * Returns a String relative to the Timestamp provided
 *
 * @param {(Date|int)} timestamp - Date object or milliseconds that will be used as reference for this component
 * @param {Object} [options]
 * @param {boolean} [options.allowFuture] - Allow dates greater than Date.now()
 * @param {string} [options.prefix] - Label preceding timestamp
 * @param {string} [options.futureSuffix] - Appended to future timestamps
 * @param {string} [options.pastSuffix] - Appended to past timestamps
 * @param {number} [options.nowEpsilon] - Interval (in seconds) that will serve as threshold for the nowString.
 * @param {string} [options.nowString] - Returned as display property when timestamp is within the nowEpsilon interval.
 * @param {string} [options.emptyResult] - Returned when timestamp is undefined
 */
export const getRelativeTimestamp = (timestamp, options) => {
    const opts = Object.assign({timestamp}, defaultOptions, options);

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
};

//----------------------------
// Implementation
//-----------------------------
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

const getPrefix  = opts => {
    const {isInvalid, prefix} = opts;
    if (isInvalid) return opts;
    opts.prefix =  prefix ? prefix + ' ' : '';
    return opts;
};

const getResult = opts => {
    const {isInvalid, elapsedTime, millis, unit, useNowString, prefix, suffix} = opts;
    if (isInvalid) return '[???]';

    // if elapsedTime was normalized to 0 (smaller than nowEpsilon)
    // then return the nowString if it's present, otherwise return the
    // default FORMAT for seconds.
    if (!elapsedTime && useNowString) return suffix;
    
    return `${prefix}${FORMAT_STRINGS[unit].replace('%d', millis)} ${suffix}`;
};
