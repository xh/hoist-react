/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {throwIf, computeOnce} from '@xh/hoist/utils/js';
import {isString, isNil} from 'lodash';
import moment, {Moment, MomentInput} from 'moment';

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

    private static _instances = new Map();
    static VALID_UNITS = ['year', 'quarter', 'month', 'week', 'day', 'date'];

    private _isoString;
    private _moment;
    private _date;

    //------------------------
    // Factories
    //------------------------
    /**
     * Get an instance of this class.
     * This is the standard way to get an instance of this object from serialized server-side data.
     *
     * @param s - a valid date in 'YYYY-MM-DD' or 'YYYYMMDD' format.
     */
    static get(s: string): LocalDate {
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
     * @param val - any string, timestamp, or date parsable by moment.js.
     */
    static from(val: MomentInput|LocalDate): LocalDate {
        if (isNil(val)) return val;
        if (val instanceof LocalDate) return val;
        const m = moment.isMoment(val) ? val : moment(val);
        return this.get(m.format('YYYY-MM-DD'));
    }

    /** LocalDate representing the current day. */
    static today(): LocalDate {
        return this.from(moment());
    }

    /** LocalDate representing the current day in the App TimeZone */
    static currentAppDay(): LocalDate {
        const svc = XH.environmentService,
            clientOffset = svc.get('clientTimeZoneOffset'),
            appOffset = svc.get('appTimeZoneOffset');
        return LocalDate.from(Date.now() + appOffset - clientOffset);

    }

    /** LocalDate representing the current day in the Server TimeZone */
    static currentServerDay(): LocalDate {
        const svc = XH.environmentService,
            clientOffset = svc.get('clientTimeZoneOffset'),
            serverOffset = svc.get('serverTimeZoneOffset');
        return LocalDate.from(Date.now() + serverOffset - clientOffset);
    }

    /** LocalDate representing the next day. */
    static tomorrow(): LocalDate {
        return this.today().nextDay();
    }

    /** LocalDate representing the previous day. */
    static yesterday(): LocalDate {
        return this.today().previousDay();
    }

    /** Is the input value a local Date? */
    static isLocalDate(v: any): boolean {
        return v?.isLocalDate;
    }

    //--------------------
    // Getters and basic methods.
    //--------------------
    get isoString(): string {
        return this._isoString;
    }

    get date(): Date {
        return new Date(this.timestamp);
    }

    get moment(): Moment {
        return this._moment.clone();
    }

    get timestamp(): number {
        return this._date.getTime();
    }

    format(...args): string {
        return this._moment.format(...args);
    }

    @computeOnce
    dayOfWeek(): string {
        return this.format('dddd');
    }

    get isToday(): boolean {
        return this === LocalDate.today();
    }

    @computeOnce
    get isWeekday(): boolean {
        const day = this._moment.day();
        return day > 0 && day < 6;
    }

    get isStartOfMonth(): boolean {return this === this.startOfMonth()}

    get isEndOfMonth(): boolean {return this === this.endOfMonth()}

    get isStartOfQuarter(): boolean {return this === this.startOfQuarter()}

    get isEndOfQuarter(): boolean {return this === this.endOfQuarter()}

    get isStartOfYear(): boolean {return this === this.startOfYear()}

    get isEndOfYear(): boolean {return this === this.endOfYear()}

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

    get isLocalDate(): boolean {return true}

    //--------------------------
    // Manipulate/Calendar logic
    //--------------------------
    add(value, unit = 'days'): LocalDate {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.add(value, unit));
    }

    subtract(value, unit = 'days'): LocalDate {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.subtract(value, unit));
    }

    startOf(unit): LocalDate {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.startOf(unit));
    }

    @computeOnce
    startOfMonth(): LocalDate {
        return this.startOf('month');
    }

    @computeOnce
    startOfQuarter(): LocalDate {
        return this.startOf('quarter');
    }

    @computeOnce
    startOfYear(): LocalDate {
        return this.startOf('year');
    }

    endOf(unit): LocalDate {
        this.ensureUnitValid(unit);
        return LocalDate.from(this.moment.endOf(unit));
    }

    @computeOnce
    endOfMonth(): LocalDate {
        return this.endOf('month');
    }

    @computeOnce
    endOfQuarter(): LocalDate {
        return this.endOf('quarter');
    }

    @computeOnce
    endOfYear(): LocalDate {
        return this.endOf('year');
    }

    @computeOnce
    nextDay(): LocalDate {
        return this.add(1);
    }

    @computeOnce
    previousDay(): LocalDate {
        return this.subtract(1);
    }

    @computeOnce
    nextWeekday(): LocalDate {
        switch (this._moment.day()) {
            case 5:     return this.add(3);
            case 6:     return this.add(2);
            default:    return this.add(1);
        }
    }

    @computeOnce
    previousWeekday(): LocalDate {
        switch (this._moment.day()) {
            case 1:     return this.subtract(3);
            case 0:     return this.subtract(2);
            default:    return this.subtract(1);
        }
    }

    /** The same date if already a weekday, or the next weekday. */
    currentOrNextWeekday(): LocalDate {
        return this.isWeekday ? this : this.nextWeekday();
    }

    /** The same date if already a weekday, or the previous weekday. */
    currentOrPreviousWeekday(): LocalDate {
        return this.isWeekday ? this : this.previousWeekday();
    }

    diff(other, unit = 'days'): number {
        this.ensureUnitValid(unit);
        return this._moment.diff(other._moment, unit);
    }

    //-------------------
    // Implementation
    //-------------------
    /** @internal - use one of the static factory methods instead. */
    private constructor(s) {
        const m = moment(s, 'YYYY-MM-DD', true);
        throwIf(
            !m.isValid(),
            `Invalid argument for LocalDate: ${s}.  Use 'YYYYMMDD' or 'YYYY-MM-DD' format.`
        );
        this._isoString = s;
        this._moment = m;
        this._date = m.toDate();
    }

    private ensureUnitValid(unit) {
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
export function isLocalDate(val): val is LocalDate {
    return !!(val?.isLocalDate);
}
