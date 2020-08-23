/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {isString} from 'lodash';
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

    // Very basic preliminary regex to partially validate input to LocalDate.get().
    // Input fully validated as a date when passed to moment in constructor.
    static fmtRegEx = new RegExp(/^\d{8}$/)

    _isoString;
    _moment;
    _date;
    _getterCache = new Map();

    //------------------------
    // Factories
    //------------------------
    /**
     * Get an instance of this class.
     * This is the standard way to get an instance of this object from serialized server-side data.
     *
     * @param {string} s - a valid date in 'YYYYMMDD' format.
     * @returns {LocalDate}
     */
    static get(s) {
        throwIf(!isString(s) || !LocalDate.fmtRegEx.test(s), 'LocalDate.get() requires a string of the form "YYYYMMDD"');

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
     * `get()` takes an explicit 'yyyyMMDD' format and is the safest way to get a LocalDate.
     *
     * @params {*} val - any string, timestamp, or date parsable by moment.js.
     * @returns {LocalDate}
     */
    static from(val) {
        throwIf(!val, 'Cannot create LocalDate from null or undefined.');
        if (val.isLocalDate) return val;
        const m = moment.isMoment(val) ? val : moment(val);
        return this.get(m.format('YYYYMMDD'));
    }

    /** @returns {LocalDate} - a LocalDate representing the current day. */
    static today() {
        return this.from(moment());
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
    dayOfWeek() {
        return this.cachedGet('dayOfWeek', () => this.format('dddd'));
    }

    /** @return {boolean} */
    get isWeekday() {
        return this.cachedGet('isWeekday', () => {
            const day = this._moment.day();
            return day > 0 && day < 6;
        });
    }

    /** @return {boolean} */
    get isStartOfMonth() {return this === this.startOfMonth()}

    /** @return {boolean} */
    get isEndOfMonth() {return this === this.endOfMonth()}

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
    startOfMonth() {
        return this.cachedGet('startOfMonth', () => this.startOf('month'));
    }

    /** @return {LocalDate} */
    endOf(unit) {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.endOf(unit));
    }

    /** @return {LocalDate} */
    endOfMonth() {
        return this.cachedGet('endOfMonth', () => this.endOf('month'));
    }

    /** @return {LocalDate} */
    nextDay() {
        return this.cachedGet('nextDay', () => this.add(1));
    }

    /** @return {LocalDate} */
    previousDay() {
        return this.cachedGet('previousDay', () => this.subtract(1));
    }

    /** @return {LocalDate} */
    nextWeekday() {
        return this.cachedGet('nextWeekday', () => {
            switch (this._moment.day()) {
                case 5:     return this.add(3);
                case 6:     return this.add(2);
                default:    return this.add(1);
            }
        });
    }

    /** @return {LocalDate} */
    previousWeekday() {
        return this.cachedGet('previousWeekday', () => {
            switch (this._moment.day()) {
                case 1:     return this.subtract(3);
                case 7:     return this.subtract(2);
                default:    return this.subtract(1);
            }
        });
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
        const m = moment(s, 'YYYYMMDD');
        throwIf(!m.isValid(), `Invalid argument for LocalDate: ${s}`);
        this._isoString = s;
        this._moment = m;
        this._date = m.toDate();
        Object.freeze(this);
    }

    ensureUnitValid(unit) {
        // Units smaller than 'day'/'date' are irrelevant to LocalDate,
        unit = moment.normalizeUnits(unit);
        throwIf(
            !LocalDate.VALID_UNITS.includes(unit),
            `Invalid unit for LocalDate adjustment: ${unit}`
        );
    }

    // Get from instance cache - for immutable getter transforms only.
    cachedGet(key, fn) {
        const {_getterCache} = this;
        if (_getterCache.has(key)) {
            return _getterCache.get(key);
        } else {
            const val = fn();
            _getterCache.set(key, val);
            return val;
        }
    }
}

/**
 * Is the input value a local Date?
 * Convenience alias for LocalDate.isLocalDate()
 */
export function isLocalDate(val) {
    return !!(val && val.isLocalDate);
}
