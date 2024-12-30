/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {inRange, isNil} from 'lodash';
import moment from 'moment';
import {box, span} from '@xh/hoist/cmp/layout';
import {
    BoxProps,
    hoistCmp,
    HoistModel,
    HoistProps,
    managed,
    useLocalModel,
    XH
} from '@xh/hoist/core';
import {fmtCompactDate, fmtDateTime} from '@xh/hoist/format';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {DAYS, HOURS, LocalDate, SECONDS} from '@xh/hoist/utils/datetime';
import {logWarn, withDefault} from '@xh/hoist/utils/js';

interface RelativeTimestampProps extends HoistProps, BoxProps {
    /**
     * Property on context model containing timestamp.
     * Specify as an alternative to direct `timestamp` prop (and minimize parent re-renders).
     */
    bind?: string;

    /** Date or milliseconds representing the starting time / time to compare. See also `bind`. */
    timestamp?: Date | number;

    /** Formatting options */
    options?: RelativeTimestampOptions;
}

export interface RelativeTimestampOptions {
    /** Allow dates greater than Date.now().*/
    allowFuture?: boolean;

    /** Use shorter timestamp text, default true for mobile clients. */
    short?: boolean;

    /** Label preceding timestamp.*/
    prefix?: string;

    /** Appended to future timestamps. */
    futureSuffix?: string;

    /** Appended to past timestamps. */
    pastSuffix?: string;

    /** String to return when timestamps are within `epsilon`. */
    equalString?: string;

    /** Threshold interval (in seconds) for `equalString`. **/
    epsilon?: number;

    /** String to return when timestamp is empty/falsy. */
    emptyResult?: string;

    /** Time to which the input timestamp is compared. */
    relativeTo?: Date | number;

    /**
     * Governs if calendar days should be used for computing return label rather than the native
     * moment 24-hour day.
     *
     * - Set to 'always' to ensure that any output less than 25 days will refer to the difference
     *   in *calendar* days.
     * - Set to 'useTimeForSameDay' for a similar behavior, but showing time differences if the
     *   two dates are on the same calendar day.
     * - Set to 'useTimeFor24Hr' for a similar behavior, but showing time differences for
     *   any differences less than 24 hours.
     *
     * Null (default) will indicate that the standard behavior, based on moment, be used, whereby
     * 'day' refers simply to a 24-hour time period and has no relation to the calendar.
     */
    localDateMode?: 'always' | 'useTimeForSameDay' | 'useTimeFor24Hr';
}

/**
 * A component to display the approximate amount of time between a given timestamp and now in a
 * friendly, human-readable format (e.g. '6 minutes ago' or 'two hours from now').
 *
 * Automatically updates on a regular interval to stay current.
 */
export const [RelativeTimestamp, relativeTimestamp] = hoistCmp.withFactory<RelativeTimestampProps>({
    displayName: 'RelativeTimestamp',
    className: 'xh-relative-timestamp',

    render({className, bind, timestamp, options, ...rest}, ref) {
        const impl = useLocalModel(RelativeTimestampLocalModel);

        return box({
            className,
            ref,
            ...rest,
            item: span({
                className: 'xh-title-tip',
                item: impl.display,
                title: fmtDateTime(impl.timestamp) as string
            })
        });
    }
});

class RelativeTimestampLocalModel extends HoistModel {
    override xhImpl = true;

    @observable display: string = '';

    model: HoistModel;

    @managed
    timer = Timer.create({
        runFn: () => this.refreshDisplay(),
        interval: 5 * SECONDS
    });

    get timestamp(): Date | number {
        const {model} = this,
            {timestamp, bind} = this.componentProps;
        return withDefault(timestamp, model && bind ? model[bind] : null);
    }

    @computed.struct
    get options(): RelativeTimestampOptions {
        return this.componentProps.options;
    }

    constructor() {
        super();
        makeObservable(this);

        this.addReaction({
            track: () => [this.timestamp, this.options],
            run: () => this.refreshDisplay()
        });
    }

    override onLinked() {
        this.model = this.lookupModel('*');
    }

    @action
    private refreshDisplay() {
        this.display = getRelativeTimestamp(this.timestamp, this.options);
    }
}

/**
 * Returns a string describing the approximate amount of time between a given timestamp and the
 * present moment in a friendly, human-readable format.
 */
export function getRelativeTimestamp(
    timestamp: Date | number,
    options: RelativeTimestampOptions = {}
): string {
    const {localDateMode} = options,
        relFmt = !isNil(options.relativeTo)
            ? (fmtCompactDate(options.relativeTo, {asHtml: true}) as string)
            : null;

    options = {
        allowFuture: false,
        short: XH.isMobileApp,
        pastSuffix: defaultPastSuffix(relFmt),
        futureSuffix: defaultFutureSuffix(relFmt, localDateMode),
        equalString: defaultEqualString(relFmt, localDateMode),
        epsilon: 10,
        emptyResult: '',
        prefix: '',
        ...options
    };

    if (!timestamp) return options.emptyResult;

    let ret = doFormat(timestamp, options);

    if (options.prefix) ret = options.prefix + ' ' + ret;

    return ret;
}

//------------------------
// Implementation
//------------------------
function defaultPastSuffix(relFmt: String): string {
    return relFmt ? `before ${relFmt}` : 'ago';
}

function defaultFutureSuffix(relFmt: String, localDateMode: string): string {
    if (relFmt) return `after ${relFmt}`;
    return localDateMode == 'always' ? 'from today' : 'from now';
}

function defaultEqualString(relFmt: String, localDateMode: string): string {
    if (relFmt) return `${relFmt?.includes(':') ? 'at' : 'on'}  ${relFmt}`;
    return localDateMode == 'always' ? 'today' : 'just now';
}

function doFormat(timestamp: Date | number, opts: RelativeTimestampOptions): string {
    let {relativeTo, localDateMode, epsilon, equalString, allowFuture, short} = opts,
        baseTimestamp = withDefault(relativeTo ?? Date.now()),
        diff = toTimestamp(baseTimestamp) - toTimestamp(timestamp),
        elapsed = Math.abs(diff);

    // 0) Snap elapsed to calendar elapsed for localDateMode.
    // (+ Early out for tomorrow/yesterday)
    if (localDateMode && inRange(elapsed, 0, 26 * DAYS)) {
        const dayDiff = LocalDate.from(baseTimestamp).diff(LocalDate.from(timestamp));

        if (
            !(localDateMode == 'useTimeForSameDay' && dayDiff == 0) &&
            !(localDateMode == 'useTimeFor24Hr' && elapsed <= 24 * HOURS)
        ) {
            elapsed = Math.abs(dayDiff * DAYS);

            if (isNil(relativeTo)) {
                if (dayDiff == -1) return 'tomorrow';
                if (dayDiff == 1) return 'yesterday';
            }
        }
    }

    const isEqual = elapsed <= (epsilon ?? 0) * SECONDS,
        isFuture = !isEqual && diff < 0;

    // 1) Degenerate cases
    if (isFuture && !allowFuture) {
        logWarn(
            `Unexpected future date provided for timestamp: ${elapsed}ms in the future.`,
            RelativeTimestamp
        );
        return '[????]';
    }

    // 2) Handle (epsilon) equals
    if (isEqual) {
        return equalString;
    }

    // 3) Basic timestamp, with suffix /prefix
    let ret = '';
    if (elapsed < 60 * SECONDS) {
        // By default, moment will show 'a few seconds' for durations of 0-45 seconds. At the higher
        // end of that range that output is a bit too inaccurate, so we replace as per below.
        ret = '<1 minute';
    } else {
        // Main delegate to humanize. Use 24h threshold vs. default 22h to avoid corner case
        // transition w/localDateMode = limited: e.g. 21 hours -> zero days.
        ret = moment.duration(elapsed).humanize({h: 24});

        // Moment outputs e.g. "a minute" instead of "1 minute". This creates some awkwardness
        // when the leading number comes and goes - "<1 minute" -> "a minute" -> "2 minutes".
        ret = ret.replace(/^(an|a) /, '1 ');
    }

    if (short) ret = ret.replace('minute', 'min').replace('second', 'sec');
    const suffix = isFuture ? opts.futureSuffix : opts.pastSuffix;
    if (suffix) ret = ret + ' ' + suffix;

    return ret;
}

function toTimestamp(v: Date | number): number {
    return v instanceof Date ? v.getTime() : v;
}
