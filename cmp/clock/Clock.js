/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {box, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, managed, useLocalModel, XH} from '@xh/hoist/core';
import {fmtDate, TIME_FMT} from '@xh/hoist/format';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, ONE_SECOND} from '@xh/hoist/utils/datetime';
import {isNumber} from 'lodash';
import PT from 'prop-types';
import {getLayoutProps} from '../../utils/react';

/**
 * A component to display the current time.
 *
 * Automatically updates on a regular interval to stay current. Supports displaying time in an
 * alternate timezone (fetching the requested zone offset from the server as required).
 */
export const [Clock, clock] = hoistCmp.withFactory({
    displayName: 'Clock',
    className: 'xh-clock',

    render({className, ...props}, ref) {
        const impl = useLocalModel(LocalModel);
        return box({
            className,
            ...getLayoutProps(props),
            ref,
            item: span(impl.display)
        });
    }
});

Clock.propTypes = {
    /** String to display if the timezone is invalid or an offset cannot be fetched. */
    errorString: PT.string,

    /** A moment.js format string. @see {@link https://momentjs.com/docs/#/displaying/format/} */
    format: PT.string,

    /** Prefix prepended to the displayed time. */
    prefix: PT.string,

    /** Suffix appended to the displayed time. */
    suffix: PT.string,

    /**
     * Timezone ID. The user's local system time will be used if omitted.
     * @see {@link https://docs.oracle.com/middleware/12212/wcs/tag-ref/MISC/TimeZones.html}
     */
    timezone: PT.string,

    /** Frequency (ms) for updating the displayed time. Defaults to once a second. */
    updateInterval: PT.number
};

class LocalModel extends HoistModel {

    offset;
    offsetException;

    @observable display = '';
    @managed timer;

    constructor() {
        super();
        makeObservable(this);
    }

    onLinked() {
        this.addReaction({
            track: () => this.componentProps.timeZone,
            run: () => this.loadTimezoneOffsetAsync(),
            fireImmediately: true
        });

        this.timer = Timer.create({
            runFn: () => this.refreshDisplay(),
            interval: () => this.componentProps.updateInterval ?? ONE_SECOND,
            fireImmediately: true
        });
    }

    async loadTimezoneOffsetAsync() {
        const {timezone} = this.componentProps;

        try {
            if (!timezone) {
                this.offset = null;
                this.offsetException = null;
                return;
            }

            const offsetResp = await XH.fetchJson({
                url: 'xh/getTimeZoneOffset',
                params: {timeZoneId: timezone}
            });
            this.offset = offsetResp.offset;
            this.offsetException = null;
        } catch (e) {
            XH.handleException(e, {showAlert: false, logOnServer: false});
            this.offset = null;
            this.offsetException = e;
        } finally {
            this.refreshDisplay();
        }
    }

    @action
    refreshDisplay() {
        const {prefix, suffix, format = TIME_FMT, errorString = '???'} = this.componentProps,
            {offset, offsetException} = this,
            parts = [];

        if (offsetException) {
            parts.push(errorString);
        } else {
            const time = getAdjustedTime(offset);
            parts.push(fmtDate(time, {fmt: format, asHtml: true}));
        }

        if (prefix) parts.unshift(prefix);
        if (suffix) parts.push(suffix);

        this.display = parts.join(' ');
    }
}

function getAdjustedTime(offset) {
    const now = new Date();
    if (!isNumber(offset)) return now;

    // Get UTC time by accounting for the local timezone offset (in minutes),
    // then add the offset returned by the server to return local time for configured timezone
    const utcTime = now.getTime() + (now.getTimezoneOffset() * MINUTES);
    return new Date(utcTime + offset);
}
