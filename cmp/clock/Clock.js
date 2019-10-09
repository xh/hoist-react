/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {box, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, managed, useLocalModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {MINUTES, ONE_SECOND} from '@xh/hoist/utils/datetime';
import {Timer} from '@xh/hoist/utils/async';
import {isEmpty, isNil, isNumber} from 'lodash';
import moment from 'moment';
import PT from 'prop-types';

/**
 * A component to display the current time.
 *
 * Automatically updates on a regular interval to stay current.
 */
export const [Clock, clock] = hoistCmp.withFactory({
    displayName: 'Clock',
    className: 'xh-clock',

    render({timezone, format, updateInterval, prefix, suffix, ...props}) {
        const impl = useLocalModel(LocalModel);
        impl.setData({timezone, format, updateInterval, prefix, suffix});

        return box({
            ...props,
            item: span(impl.display)
        });
    }
});
Clock.propTypes = {
    /**
     * Timezone id. The user's local system time will be used if omitted.
     * @see {@link https://docs.oracle.com/middleware/12212/wcs/tag-ref/MISC/TimeZones.html} */
    timezone: PT.string,

    /** moment.js date format string. @see {@link https://momentjs.com/docs/#/displaying/format/} */
    format: PT.string,

    /** Prefix for the displayed text */
    prefix: PT.string,

    /** Suffix for the displayed text */
    suffix: PT.string,

    /** Frequency (ms) for updating the displayed text */
    updateInterval: PT.number
};

@HoistModel
class LocalModel {
    timezone;
    format;
    updateInterval;
    prefix;
    suffix;

    offset;
    offsetException;

    @observable display = '';

    @managed
    timer = Timer.create({
        runFn: () => this.refreshDisplay(),
        interval: ONE_SECOND
    });

    setData({timezone, format = 'h:mm:ss a', updateInterval = ONE_SECOND, prefix, suffix}) {
        if (timezone !== this.timezone) {
            this.timezone = timezone;
            this.updateTimezoneAsync();
        }

        this.format = format;
        this.updateInterval = updateInterval;
        this.prefix = prefix;
        this.suffix = suffix;

        this.timer.setInterval(updateInterval);
    }

    async updateTimezoneAsync() {
        const {timezone} = this;
        if (!isEmpty(timezone)) {
            try {
                const {offset} = await XH.fetchJson({url: 'xh/getTimeZoneOffset', params: {timeZoneId: timezone}});
                this.offset = offset;
            } catch (e) {
                XH.handleException(e, {showAlert: false});
                this.offset = null;
                this.offsetException = e;
            } finally {
                this.refreshDisplay();
            }
        } else {
            this.offset = null;
            this.offsetException = null;
            this.refreshDisplay();
        }
    }

    @action
    refreshDisplay() {
        if (this.offsetException) {
            this.display = '';
            return;
        }

        const {prefix, suffix, format, offset} = this,
            time = getAdjustedTime(offset),
            parts = [time ? moment(time).format(format) : '???'];

        if (!isEmpty(prefix)) parts.unshift(prefix);
        if (!isEmpty(suffix)) parts.push(suffix);

        const display = parts.join(' ');
        if (this.display !== display) this.display = display;
    }
}

function getAdjustedTime(offset) {
    const now = new Date();
    if (isNil(offset) || !isNumber(offset)) return now;

    // Get UTC time by accounting for the local timezone offset (in minutes),
    // then add the offset returned by the server to return local time for configured timezone
    const utcTime = now.getTime() + (now.getTimezoneOffset() * MINUTES);
    return new Date(utcTime + offset);
}