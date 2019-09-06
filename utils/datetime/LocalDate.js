/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import moment from 'moment';
import {throwIf} from '@xh/hoist/utils/js';
import {isString} from 'lodash';

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
     * @param {string} s - a valid date in 'YYYYMMDD' format.
     * @returns {LocalDate}
     */
    static get(s) {
        throwIf(!isString(s), 'LocalDate.get() requires a string of the form "YYYYMMDD"');

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

    /**
     * Return a LocalDate representing the current day.
     * @returns {LocalDate}
     */
    static today() {
        return this.from(moment());
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
    get isoString() {
        return this._isoString;
    }

    get date() {
        return new Date(this.timestamp);
    }

    get moment() {
        return this._moment.clone();
    }

    get timestamp() {
        return this._date.getTime();
    }

    format(...args) {
        return this._moment.format(...args);
    }

    dayOfWeek() {
        return this.format('dddd');
    }

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
    add(value, unit = 'days') {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.add(value, unit));
    }

    subtract(value, unit = 'days') {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.subtract(value, unit));
    }

    startOf(unit) {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.startOf(unit));
    }

    endOf(unit) {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.endOf(unit));
    }

    nextDay() {
        return this.add(1);
    }

    previousDay() {
        return this.subtract(1);
    }

    nextWeekday() {
        switch (this._moment.day()) {
            case 5:     return this.add(3);
            case 6:     return this.add(2);
            default:    return this.add(1);
        }
    }

    previousWeekday() {
        switch (this._moment.day()) {
            case 1:     return this.subtract(3);
            case 7:     return this.subtract(2);
            default:    return this.subtract(1);
        }
    }

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
}

/**
 * Is the input value a local Date?
 * Convenience alias for LocalDate.isLocalDate()
 */
export function isLocalDate(val) {
    return val && val.isLocalDate;
}