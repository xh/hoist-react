/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {box, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, managed, useLocalModel, XH} from '@xh/hoist/core';
import {fmtCompactDate, fmtDateTime} from '@xh/hoist/format';
import {action, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {apiRemoved, withDefault} from '@xh/hoist/utils/js';
import moment from 'moment';
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
     * Property on context model containing timestamp.
     * Specify as an alternative to direct `timestamp` prop (and minimize parent re-renders).
     */
    bind: PT.string,

    /** Date or milliseconds representing the starting time / time to compare. See also `bind`. */
    timestamp: PT.oneOfType([PT.instanceOf(Date), PT.number]),

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
        interval: 5 * SECONDS
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
 * @param {(Date|int)} timestamp - Date or milliseconds representing the starting time / time to compare.
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
export function getRelativeTimestamp(timestamp, options = {}) {
    apiRemoved(options.nowEpsilon, 'nowEpsilon', "Use 'epsilon' instead.");
    apiRemoved(options.nowString, 'nowString', "Use 'equalString' instead.");

    const relTo = options.relativeTo,
        relFmt = relTo ? fmtCompactDate(relTo) : null,
        relFmtIsTime = relFmt?.includes(':');

    options = {
        timestamp,
        allowFuture: false,
        short: XH.isMobile,
        futureSuffix: relTo ? `after ${relFmt}` : 'from now',
        pastSuffix: relTo ? `before ${relFmt}` : 'ago',
        equalString: relTo ? `${relFmtIsTime ? 'at' : 'on'}  ${relFmt}` : 'just now',
        epsilon: 10,
        emptyResult: '',
        prefix: '',
        relativeTo: Date.now(),
        ...options
    };

    if (!timestamp) return options.emptyResult;

    return doFormat(options);
}

//------------------------
// Implementation
//------------------------
function doFormat(opts) {
    const {prefix, equalString, epsilon, allowFuture, short} = opts,
        diff = opts.relativeTo - opts.timestamp,
        elapsed = Math.abs(diff),
        isEqual =  elapsed < epsilon * SECONDS,
        isFuture = !isEqual && diff < 0;

    let ret;
    if (isEqual) {
        ret = equalString;
    } else if (isFuture && !allowFuture) {
        console.warn(`Unexpected future date provided for timestamp: ${elapsed}ms in the future.`);
        ret = '[????]';
    } else {
        // By default, moment will show 'a few seconds' for durations of 0-45 seconds. At the higher
        // end of that range that output is a bit too inaccurate, so we replace as per below.
        ret = (elapsed < 60 * SECONDS) ?
            '<1 minute' :
            moment.duration(elapsed).humanize();

        if (short) ret = ret.replace('minute', 'min').replace('second', 'sec');

        ret += ' ' + (isFuture ? opts.futureSuffix : opts.pastSuffix);
    }

    return prefix ? prefix + ' ' + ret : ret;
}