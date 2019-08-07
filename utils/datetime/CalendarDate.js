/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import moment from 'moment';

/**
 * A Date representation that does not contain time information.
 *
 * Includes getters for equivalents values in moment(), js date and timestamp formats.
 * Can also be formatted using any moment format string.
 *
 * Supports many of the comment manipulation / query methods provided by moment,
 * including adding / subtracting units and comparing to other CalendarDates/moments/Dates.
 */
export class CalendarDate {

    /** @member {string} */
    value;

    /** @member {boolean} */
    isCalendarDate = true;

    /**
     * Can be created by passing any of the following:
     *      {CalendarDate} - Another CalendarDate instance.
     *      {Date} - A JS Date instance.
     *      {moment} - A moment instance.
     *      {string} - A moment parsable string
     *      {null} - defaults to current date
     */
    constructor(date) {
        this.value = date && date.isCalendarDate ? date.value : moment(date).format('YYYYMMDD');
    }

    static today() {
        return new CalendarDate();
    }

    //--------------------
    // Output
    //--------------------
    get moment() {
        return moment(this.value, 'YYYYMMDD');
    }

    get date() {
        const ret = this.moment.toDate();
        return isNaN(ret) ? null : ret;
    }

    get timestamp() {
        return this.moment.valueOf();
    }

    format(...args) {
        return this.moment.format(...args);
    }

    toString() {
        return this.value;
    }

    dayOfWeek() {
        return this.format('dddd');
    }

    //--------------------
    // Manipulate
    //--------------------
    /**
     * The following methods accept the following units:
     * ['year', 'quarter', 'month', 'week', 'day', 'date']
     *
     * All methods return a new CalendarDate instance.
     */
    add(value, unit = 'days') {
        if (!this.unitIsValid(unit)) return this;
        const {moment} = this;
        moment.add(value, unit);
        return new CalendarDate(moment);
    }

    subtract(value, unit = 'days') {
        if (!this.unitIsValid(unit)) return this;
        const {moment} = this;
        moment.subtract(value, unit);
        return new CalendarDate(moment);
    }

    startOf(unit) {
        if (!this.unitIsValid(unit)) return this;
        const {moment} = this;
        moment.startOf(unit);
        return new CalendarDate(moment);
    }

    endOf(unit) {
        if (!this.unitIsValid(unit)) return this;
        const {moment} = this;
        moment.endOf(unit);
        return new CalendarDate(moment);
    }

    nextBusinessDay() {
        const {moment} = this;
        switch (moment.day()) {
            case 5:
                return this.add(3, 'days'); // Friday
            case 6:
                return this.add(2, 'days'); // Saturday
            default:
                return this.add(1, 'days');
        }
    }

    prevBusinessDay() {
        const {moment} = this;
        switch (moment.day()) {
            case 1:
                return this.subtract(3, 'days'); // Monday
            case 7:
                return this.subtract(2, 'days'); // Sunday
            default:
                return this.subtract(1, 'days');
        }
    }

    //--------------------
    // Query
    //--------------------
    equals(other) {
        other = new CalendarDate(other);
        return this.timestamp === other.timestamp;
    }

    isBefore(other) {
        other = new CalendarDate(other);
        return this.timestamp < other.timestamp;
    }

    isAfter(other) {
        other = new CalendarDate(other);
        return this.timestamp > other.timestamp;
    }

    diff(other) {
        other = new CalendarDate(other);
        return this.timestamp - other.timestamp;
    }

    //-------------------
    // Implementation
    //-------------------
    /**
     * Units smaller than 'day'/'date' are irrelevant to CalendarDates,
     * and calls to set/add/subtract these units should be ignored
     */
    unitIsValid(unit) {
        unit = moment.normalizeUnits(unit);
        return ['year', 'quarter', 'month', 'week', 'day', 'date'].includes(unit);
    }

}