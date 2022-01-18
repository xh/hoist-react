/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {throwIf, computeOnce} from '@xh/hoist/utils/js';
import {isString, isNil} from 'lodash';
import moment from 'moment';

/**
 * A Date representation that does not contain time information. Useful for business day or calendar
 * day data where time and time zone should be explicitly ignored.  Client-side equivalent of the
 * Java `LocalDate` class.
 *
 * This class is immutable. All methods for manipulation return a new LocalDate instance.
 * For efficiency and to enable strict equality checks, instances of this class are memoized:
 * only a single version of the object will be created and returned for each calendar day,
 * as long as the caller uses one of the *public factory methods*, which they always should!
 *
 * Unit accepted by manipulation methods are ['year', 'quarter', 'month', 'week', 'day', 'date'].
 */
export class LocalDate {

    static _instances = new Map();
    static VALID_UNITS = ['year', 'quarter', 'month', 'week', 'day', 'date'];

    _isoString;
    _moment;
    _date;

    //------------------------
    // Factories
    //------------------------
    /**
     * Get an instance of this class.
     * This is the standard way to get an instance of this object from serialized server-side data.
     *
     * @param {string} s - a valid date in 'YYYY-MM-DD' or 'YYYYMMDD' format.
     * @returns {LocalDate}
     */
    static get(s) {
        if (isNil(s)) return s;
        throwIf(!isString(s), 'String required for LocalDate.get()');
        s = s.length == 8 ? s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8) : s;
        let {_instances} = this,
            ret = _instances.get(s);
        if (!ret) {
            ret = new LocalDate(s);
            _instances.set(s, ret);
        }
        return ret;
    }

    /**
     * Get an instance of this class.
     *
     * Note: Applications should favor using the `get()` factory instead of this method.
     * `get()` takes an explicit 'YYYYMMDD' or 'YYYY-MM-DD' format and is the safest way to get
     * a LocalDate.
     *
     * @params {*} val - any string, timestamp, or date parsable by moment.js.
     * @returns {LocalDate}
     */
    static from(val) {
        if (isNil(val)) return val;
        if (val.isLocalDate) return val;
        const m = moment.isMoment(val) ? val : moment(val);
        return this.get(m.format('YYYY-MM-DD'));
    }

    /** @returns {LocalDate} - a LocalDate representing the current day. */
    static today() {
        return this.from(moment());
    }

    /** @returns {LocalDate} - a LocalDate representing the current day in the App TimeZone */
    static currentAppDay() {
        const svc = XH.environmentService,
            clientOffset = svc.get('clientTimeZoneOffset'),
            appOffset = svc.get('appTimeZoneOffset');
        return LocalDate.from(Date.now() + appOffset - clientOffset);

    }

    /** @returns {LocalDate} - a LocalDate representing the current day in the Server TimeZone */
    static currentServerDay() {
        const svc = XH.environmentService,
            clientOffset = svc.get('clientTimeZoneOffset'),
            serverOffset = svc.get('serverTimeZoneOffset');
        return LocalDate.from(Date.now() + serverOffset - clientOffset);
    }

    /** @returns {LocalDate} - a LocalDate representing the next day. */
    static tomorrow() {
        return this.today().nextDay();
    }

    /** @returns {LocalDate} - a LocalDate representing the previous day. */
    static yesterday() {
        return this.today().previousDay();
    }

    /**
     * Is the input value a local Date?
     * @param {*} v
     * @returns {boolean}
     */
    static isLocalDate(v) {
        return v && v.isLocalDate;
    }

    //--------------------
    // Getters and basic methods.
    //--------------------
    /** @return {string} */
    get isoString() {
        return this._isoString;
    }

    /** @return {Date} */
    get date() {
        return new Date(this.timestamp);
    }

    /** @return {moment} */
    get moment() {
        return this._moment.clone();
    }

    /** @return {number} */
    get timestamp() {
        return this._date.getTime();
    }

    /** @return {string} */
    format(...args) {
        return this._moment.format(...args);
    }

    /** @return {string} */
    @computeOnce
    dayOfWeek() {
        return this.format('dddd');
    }

    /** @return {boolean} */
    get isToday() {
        return this === LocalDate.today();
    }

    /** @return {boolean} */
    @computeOnce
    get isWeekday() {
        const day = this._moment.day();
        return day > 0 && day < 6;
    }

    /** @return {boolean} */
    get isStartOfMonth() {return this === this.startOfMonth()}

    /** @return {boolean} */
    get isEndOfMonth() {return this === this.endOfMonth()}

    /** @return {boolean} */
    get isStartOfQuarter() {return this === this.startOfQuarter()}

    /** @return {boolean} */
    get isEndOfQuarter() {return this === this.endOfQuarter()}

    /** @return {boolean} */
    get isStartOfYear() {return this === this.startOfYear()}

    /** @return {boolean} */
    get isEndOfYear() {return this === this.endOfYear()}

    //----------------
    // Core overrides.
    //----------------
    toString() {
        return this._isoString;
    }

    toJSON() {
        return this._isoString;
    }

    valueOf() {
        return this._isoString;
    }

    get isLocalDate() {return true}

    //--------------------------
    // Manipulate/Calendar logic
    //--------------------------
    /** @return {LocalDate} */
    add(value, unit = 'days') {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.add(value, unit));
    }

    /** @return {LocalDate} */
    subtract(value, unit = 'days') {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.subtract(value, unit));
    }

    /** @return {LocalDate} */
    startOf(unit) {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.startOf(unit));
    }

    /** @return {LocalDate} */
    @computeOnce
    startOfMonth() {
        return this.startOf('month');
    }

    /** @return {LocalDate} */
    @computeOnce
    startOfQuarter() {
        return this.startOf('quarter');
    }

    /** @return {LocalDate} */
    @computeOnce
    startOfYear() {
        return this.startOf('year');
    }

    /** @return {LocalDate} */
    endOf(unit) {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.endOf(unit));
    }

    /** @return {LocalDate} */
    @computeOnce
    endOfMonth() {
        return this.endOf('month');
    }

    /** @return {LocalDate} */
    @computeOnce
    endOfQuarter() {
        return this.endOf('quarter');
    }

    /** @return {LocalDate} */
    @computeOnce
    endOfYear() {
        return this.endOf('year');
    }

    /** @return {LocalDate} */
    @computeOnce
    nextDay() {
        return this.add(1);
    }

    /** @return {LocalDate} */
    @computeOnce
    previousDay() {
        return this.subtract(1);
    }

    /** @return {LocalDate} */
    @computeOnce
    nextWeekday() {
        switch (this._moment.day()) {
            case 5:     return this.add(3);
            case 6:     return this.add(2);
            default:    return this.add(1);
        }
    }

    /** @return {LocalDate} */
    @computeOnce
    previousWeekday() {
        switch (this._moment.day()) {
            case 1:     return this.subtract(3);
            case 0:     return this.subtract(2);
            default:    return this.subtract(1);
        }
    }

    /** @return {LocalDate} - the same date if already a weekday, or the next weekday. */
    currentOrNextWeekday() {
        return this.isWeekday ? this : this.nextWeekday();
    }

    /** @return {LocalDate} - the same date if already a weekday, or the previous weekday. */
    currentOrPreviousWeekday() {
        return this.isWeekday ? this : this.previousWeekday();
    }

    /** @return {number} */
    diff(other, unit = 'days') {
        this.ensureUnitValid(unit);
        return this._moment.diff(other._moment, unit);
    }

    //-------------------
    // Implementation
    //-------------------
    /** @private - use one of the static factory methods instead. */
    constructor(s) {
        const m = moment(s, 'YYYY-MM-DD', true);
        throwIf(
            !m.isValid(),
            `Invalid argument for LocalDate: ${s}.  Use 'YYYYMMDD' or 'YYYY-MM-DD' format.`
        );
        this._isoString = s;
        this._moment = m;
        this._date = m.toDate();
    }

    ensureUnitValid(unit) {
        // Units smaller than 'day'/'date' are irrelevant to LocalDate,
        unit = moment.normalizeUnits(unit);
        throwIf(
            !LocalDate.VALID_UNITS.includes(unit),
            `Invalid unit for LocalDate adjustment: ${unit}`
        );
    }
}

/**
 * Is the input value a local Date?
 * Convenience alias for LocalDate.isLocalDate()
 */
export function isLocalDate(val) {
    return !!(val && val.isLocalDate);
}
