/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {label} from 'hoist/kit/blueprint';
import {SECONDS, MINUTES, HOURS, DAYS} from 'hoist/utils/DateTimeUtils';

/**
 * A Relative Timestamp component
 *
 * @prop timeStamp, Date Object - Date that will be used as reference for this component
 * @prop options, Object
 *      allowFuture, boolean -  Allow dates greater than new Date()
 *      futureSuffix, string - String appended to future timestamps
 *      pastSuffix, string - String appended to past timestamps
 *      nowEpsilon, integer - Number of seconds from initial timeStamp to be considered as `now`.
 *      nowString, string - String used as display property when timeStamp is within nowEpsilon
 *      emptyString, string - String to be used when timeStamp is undefined
 */

@hoistComponent()
class RelativeTimestamp extends Component {
    FORMAT_STRINGS = {
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

    defaultOptions = {
        allowFuture: false,
        futureSuffix: 'from now',
        pastSuffix: 'ago',
        nowString: null,
        nowEpsilon: 30,
        emptyString: 'never'
    };

    _now = null;
    _timeDiff = null;
    _isFuture = false;
    _isInvalid = false;
    _unit = null;
    _value = null;
    _suffix = null;

    render() {
        const display = this.getRelativeString();

        return label(display);
    }

    getRelativeString() {
        const {timeStamp, options} = this.props,
            opt = Object.assign(this.defaultOptions, options);

        if (!timeStamp) return opt.emptyString;

        return this.getNow()
            .getDiff(timeStamp)
            .adjustDiff(opt)
            .getUnitAndValue()
            .getSuffix(opt)
            .generateStringByDateRange(opt);
    }

    getNow() {
        this._now = new Date();
        return this;
    }

    getDiff(timeStamp) {
        const diff = this._now - timeStamp;
        this._isFuture = diff < 0;
        this._timeDiff = Math.abs(diff);

        return this;
    }

    adjustDiff(options) {
        const {allowFuture, nowEpsilon} = options;

        if (this._timeDiff < nowEpsilon * SECONDS) {
            this._timeDiff = 0;
        } else if (!allowFuture && this._isFuture) {
            this._isInvalid = true;
            console.warn(`Unexpected future date provided for timestamp: ${this._timeDiff}ms in the future.`);
        }
        return this;
    }

    getUnitAndValue() {
        const {_isInvalid, _timeDiff} = this;
        if (_isInvalid || !_timeDiff) return this;

        const types = [
            {name: 'seconds',  formula: v => v / SECONDS},
            {name: 'minute',   formula: v => v / MINUTES},
            {name: 'hour',     formula: v => v / HOURS},
            {name: 'day',      formula: v => v / DAYS},
            {name: 'month',    formula: v => v / (DAYS * 30)},
            {name: 'year',    formula: v => v / (DAYS * 365)}
        ];

        types.forEach(type => {
            const val = type.formula(this._timeDiff);
            if (val >= 1) {
                this._value = parseInt(val);
                this._unit = `${type.name}${type.name !== 'seconds' && val >=2 ? 's' : ''}`;
            }
        });

        return this;
    }

    getSuffix(options) {
        const {_isInvalid, _timeDiff, _isFuture} = this;
        if (_isInvalid) return this;

        if (!_timeDiff) {
            this._suffix = options.nowString || '';
        } else {
            this._suffix = options[_isFuture ? 'futureSuffix' : 'pastSuffix'];
        }

        return this;
    }

    generateStringByDateRange() {
        const {_isInvalid, _timeDiff, _unit, _value, _suffix, FORMAT_STRINGS} = this;
        if (_isInvalid) return '[???]';
        if (!_timeDiff || _unit === 'seconds') {
            if (!_timeDiff && _suffix) {
                return _suffix;
            }
            return FORMAT_STRINGS.seconds;
        }

        return `${FORMAT_STRINGS[_unit].replace('%d', _value)} ${_suffix}`;
    }
}

export const relativeTimestamp = elemFactory(RelativeTimestamp);