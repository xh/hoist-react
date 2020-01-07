/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {box, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, managed, useLocalModel, XH} from '@xh/hoist/core';
import {fmtCompactDate, fmtDateTime} from '@xh/hoist/format';
import {action, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {apiRemoved, withDefault} from '@xh/hoist/utils/js';
import * as moment from 'moment';
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
     * Date or milliseconds representing the starting / time to compare.
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
 * @param {string} [options.equalString] - string to return when timestamps are within `epsilon`.
 * @param {number} [options.epsilon] - threshold interval (in seconds) for `equalString`.
 * @param {string} [options.emptyResult] - string to return when timestamp is empty/falsey.
 * @param {(Date|int)} [options.relativeTo] - time to which the input timestamp is compared
 */
export function getRelativeTimestamp(timestamp, options) {
    apiRemoved(options.nowEpsilon, 'nowEpsilon', 'Use `epsilon` instead.');
    apiRemoved(options.nowString, 'nowString', 'Use `equalString` instead.');

    const defaultOptions = {
            allowFuture: false,
            short: XH.isMobile,
            futureSuffix: options.relativeTo ? `after ${fmtCompactDate(options.relativeTo)}` : 'from now',
            pastSuffix: options.relativeTo ? `before ${fmtCompactDate(options.relativeTo)}` : 'ago',
            equalString: null,
            epsilon: 30,
            emptyResult: '',
            relativeTo: Date.now()
        },
        opts = Object.assign({timestamp}, defaultOptions, options);

    if (!timestamp) return opts.emptyResult;

    return doFormat(opts);
}

//------------------------
// Implementation
//------------------------
function doFormat(opts) {
    const diff = opts.relativeTo - opts.timestamp;
    const isFuture = diff < 0;

    if (isFuture && !opts.allowFuture) {
        console.warn(`Unexpected future date provided for timestamp: ${elapsed}ms in the future.`);
        return '[???]';
    }

    const elapsed = Math.abs(diff);
    if (elapsed < opts.epsilon * SECONDS && opts.equalString) {
        return opts.equalString;
    }

    const suffix = isFuture ? opts.futureSuffix : opts.pastSuffix;

    let humanized = (elapsed > 10 * SECONDS && elapsed < 60 * SECONDS) ? '<1 minute' : moment.duration(elapsed).humanize();

    if (opts.short) {
        humanized = humanized.replace('minute', 'min').replace('second', 'sec');
    }

    return `${opts.prefix} ${humanized} ${suffix}`;
}