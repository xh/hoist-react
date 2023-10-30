/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
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
import {DAYS, LocalDate, SECONDS} from '@xh/hoist/utils/datetime';
import {withDefault} from '@xh/hoist/utils/js';

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

    /** Do not use time portion of dates when calculating differences. */
    localDateMode?: boolean;
}

/**
 * A component to display the approximate amount of time between a given timestamp and now in a
 * friendly, human readable format (e.g. '6 minutes ago' or 'two hours from now').
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
 * present moment in a friendly, human readable format.
 */
export function getRelativeTimestamp(
    timestamp: Date | number,
    options: RelativeTimestampOptions = {}
): string {
    const localDateMode = options.localDateMode ?? false,
        relTo = options.relativeTo,
        relFmt = relTo ? (fmtCompactDate(relTo, {asHtml: true}) as string) : null,
        relFmtIsTime = relFmt?.includes(':');

    options = {
        allowFuture: false,
        short: XH.isMobileApp,
        futureSuffix: relTo ? `after ${relFmt}` : localDateMode ? 'from today' : 'from now',
        pastSuffix: relTo ? `before ${relFmt}` : 'ago',
        equalString: relTo
            ? `${relFmtIsTime ? 'at' : 'on'}  ${relFmt}`
            : localDateMode
            ? 'today'
            : 'just now',
        epsilon: 10,
        emptyResult: '',
        prefix: '',
        relativeTo: Date.now(),
        localDateMode,
        ...options
    };

    if (!timestamp) return options.emptyResult;

    return doFormat(timestamp, options);
}

//------------------------
// Implementation
//------------------------
function doFormat(timestamp: Date | number, opts: RelativeTimestampOptions): string {
    const {prefix, equalString, epsilon, allowFuture, short, localDateMode} = opts,
        ldDiff = getLocalDateDiff(opts.relativeTo, timestamp),
        rawDiff = toTimestamp(opts.relativeTo) - toTimestamp(timestamp),
        diff = localDateMode ? ldDiff : rawDiff,
        elapsed = Math.abs(diff),
        isEqual = elapsed <= (epsilon ?? 0) * SECONDS,
        isFuture = !isEqual && diff < 0;

    let ret;
    if (isEqual) {
        ret = equalString;
    } else if (isFuture && !allowFuture) {
        console.warn(`Unexpected future date provided for timestamp: ${elapsed}ms in the future.`);
        ret = '[????]';
    } else {
        const duration = getDuration(elapsed, localDateMode, ldDiff);
        // By default, moment will show 'a few seconds' for durations of 0-45 seconds. At the higher
        // end of that range that output is a bit too inaccurate, so we replace as per below.
        ret = elapsed < 60 * SECONDS ? '<1 minute' : duration.humanize();

        // Moment outputs e.g. "a minute" instead of "1 minute". This creates some awkwardness
        // when the leading number comes and goes - "<1 minute" -> "a minute" -> "2 minutes".
        ret = ret.replace(/^(an|a) /, '1 ');

        if (short) ret = ret.replace('minute', 'min').replace('second', 'sec');

        ret += ' ' + (isFuture ? opts.futureSuffix : opts.pastSuffix);
    }

    return prefix ? prefix + ' ' + ret : ret;
}

function toTimestamp(v: Date | number): number {
    return v instanceof Date ? v.getTime() : v;
}

function getLocalDateDiff(relativeTo: Date | number, timestamp: Date | number): number {
    return LocalDate.from(relativeTo).diff(LocalDate.from(timestamp)) * DAYS;
}

/**
 * Ensure that moment's "days" duration is always a localDate calculation.
 * This prevents presenting "2 days ago" for a timestamp representing "yesterday".
 */
function getDuration(elapsed: number, localDateMode: boolean, ldDiff: number): moment.Duration {
    const duration = moment.duration(elapsed);
    if (localDateMode || !duration.days()) return duration;

    const atLeastAMonth = ['months', 'years'].some(it => duration[it]());
    if (atLeastAMonth) return duration;

    // recalculate duration as if in localDate mode
    return moment.duration(Math.abs(ldDiff));
}
