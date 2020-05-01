/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {box, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, managed, useLocalModel, XH} from '@xh/hoist/core';
import {fmtDate, TIME_FMT} from '@xh/hoist/format';
import {action, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {MINUTES, ONE_SECOND} from '@xh/hoist/utils/datetime';
import {withDefault} from '@xh/hoist/utils/js';
import {isNumber} from 'lodash';
import PT from 'prop-types';

/**
 * A component to display the current time.
 *
 * Automatically updates on a regular interval to stay current. Supports displaying time in an
 * alternate timezone (fetching the requested zone offset from the server as required).
 */
export const [Clock, clock] = hoistCmp.withFactory({
    displayName: 'Clock',
    className: 'xh-clock',

    render({timezone, format, updateInterval, prefix, suffix, errorString, ...props}) {
        format = format || TIME_FMT;
        updateInterval = updateInterval || ONE_SECOND;
        errorString = withDefault(errorString, '???');

        const impl = useLocalModel(LocalModel);
        impl.setData({timezone, format, updateInterval, prefix, suffix, errorString});

        return box({
            ...props,
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

@HoistModel
class LocalModel {
    timezone;
    format;
    updateInterval;
    prefix;
    suffix;
    errorString;

    offset;
    offsetException;

    @observable display = '';
    @managed timer;

    setData({timezone, format, updateInterval, prefix, suffix, errorString}) {
        this.format = format;
        this.updateInterval = updateInterval;
        this.prefix = prefix;
        this.suffix = suffix;
        this.errorString = errorString;

        if (timezone !== this.timezone) {
            this.timezone = timezone;
            this.loadTimezoneOffsetAsync();
        }

        if (!this.timer) {
            this.timer = Timer.create({
                runFn: () => this.refreshDisplay(),
                interval: () => this.updateInterval
            });
        }
    }

    async loadTimezoneOffsetAsync() {
        const {timezone} = this;

        if (!timezone) {
            this.offset = null;
            this.offsetException = null;
            this.refreshDisplay();
        } else {
            try {
                const {offset} = await XH.fetchJson({
                    url: 'xh/getTimeZoneOffset',
                    params: {timeZoneId: timezone}
                });
                this.offset = offset;
            } catch (e) {
                XH.handleException(e, {showAlert: false, logOnServer: false});
                this.offset = null;
                this.offsetException = e;
            } finally {
                this.refreshDisplay();
            }
        }
    }

    @action
    refreshDisplay() {
        const {prefix, suffix, format, offset, offsetException} = this,
            parts = [];

        if (offsetException) {
            parts.push(this.errorString);
        } else {
            const time = getAdjustedTime(offset);
            parts.push(fmtDate(time, format));
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