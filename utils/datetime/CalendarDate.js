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
        this.setValue(date instanceof CalendarDate ? date.value : date);
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

    //--------------------
    // Manipulate
    //--------------------
    setValue(date) {
        this.value = moment(date).format('YYYYMMDD');
    }

    today() {
        this.setValue();
    }

    set(unit, value) {
        if (!this.unitIsValid(unit)) return;
        const {moment} = this;
        moment.set(unit, value);
        this.setValue(moment);
    }

    add(value, unit = 'days') {
        if (!this.unitIsValid(unit)) return;
        const {moment} = this;
        moment.add(value, unit);
        this.setValue(moment);
    }

    subtract(value, unit = 'days') {
        if (!this.unitIsValid(unit)) return;
        const {moment} = this;
        moment.subtract(value, unit);
        this.setValue(moment);
    }

    startOf(unit) {
        if (!this.unitIsValid(unit)) return;
        const {moment} = this;
        moment.startOf(unit);
        this.setValue(moment);
    }

    endOf(unit) {
        if (!this.unitIsValid(unit)) return;
        const {moment} = this;
        moment.endOf(unit);
        this.setValue(moment);
    }

    //--------------------
    // Query
    //--------------------
    get(unit) {
        return this.moment.get(unit);
    }

    diff(other, ...args) {
        return this.moment.diff(this.makeMomentSafe(other), ...args);
    }

    isBefore(other, ...args) {
        return this.moment.isBefore(this.makeMomentSafe(other), ...args);
    }

    isSame(other, ...args) {
        return this.moment.isSame(this.makeMomentSafe(other), ...args);
    }

    isAfter(other, ...args) {
        return this.moment.isAfter(this.makeMomentSafe(other), ...args);
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

    /**
     * When doing comparisons between CalendarDates, we want to
     * extract the moment from the other CalendarDate. This allows to compares
     * CalendarDates to moment instances or JS Date instances.
     */
    makeMomentSafe(other) {
        return other.isCalendarDate ? other.moment : other;
    }

}