/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import moment from 'moment';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * A Date representation that does not contain time information.  Useful for business day,
 * or calendar day data where time and time zone should be explicitly ignored.  Client-side
 * equivalent of java LocalDate class.
 *
 * This class is immutable.  All methods for manipulation return a new LocalDate instance.
 * Unit accepted by the manipulation methods are ['year', 'quarter', 'month', 'week', 'day', 'date']
 *
 * Includes getters for equivalents values in moment, js date and timestamp formats.
 * Can also be formatted using any moment format string.
 */
export class LocalDate {

    /** @member {string} */
    value;

    /** @member {boolean} */
    get isLocalDate() {return true}

    /**
     * Get an instance of this class.  Instance can be created by passing any of the following:
     *      {LocalDate} - Another LocalDate instance.
     *      {Date} - A JS Date instance.
     *      {moment} - A moment instance.
     *      {string} - A moment parsable string
     *      {undefined} - defaults to current date
     */
    static from(val) {
        return val && val.isLocalDate ? val : this.fromIsoDate(moment(val).format('YYYYMMDD'));
    }

    /**
     *  Get an instance of this class from  a string in 'yyyyMMDD' format.
     *
     *  Most efficient way to create an instance of the class, and typical way to create it from
     *  serialized server-side data.
     */
    static fromIsoDate(val) {
        return new LocalDate(val);
    }

    static today() {
        return this.from();
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

    dayOfWeek() {
        return this.format('dddd');
    }

    toString() {
        return this.value;
    }

    toJSON() {
        return this.value;
    }

    //--------------------
    // Manipulate
    //--------------------
    add(value, unit = 'days') {
        this.ensureUnitValid(unit);
        const {moment} = this;
        moment.add(value, unit);
        return LocalDate.from(moment);
    }

    subtract(value, unit = 'days') {
        this.ensureUnitValid(unit);
        const {moment} = this;
        moment.subtract(value, unit);
        return LocalDate.from(moment);
    }

    startOf(unit) {
        this.ensureUnitValid(unit);
        const {moment} = this;
        moment.startOf(unit);
        return LocalDate.from(moment);
    }

    endOf(unit) {
        this.ensureUnitValid(unit);
        const {moment} = this;
        moment.endOf(unit);
        return LocalDate.from(moment);
    }

    nextDay() {
        return this.add(1);
    }

    previousDay() {
        return this.subtract(1);
    }

    nextBusinessDay() {
        switch (this.moment.day()) {
            case 5:     return this.add(3);
            case 6:     return this.add(2);
            default:    return this.add(1);
        }
    }

    previousBusinessDay() {
        switch (this.moment.day()) {
            case 1:     return this.subtract(3);
            case 7:     return this.subtract(2);
            default:    return this.subtract(1);
        }
    }

    //--------------------
    // Query
    //--------------------
    equals(other) {
        return this.compareTo(other) === 0;
    }

    isBefore(other) {
        return this.compareTo(other) < 0;
    }

    isAfter(other) {
        return this.compareTo(other) > 0;
    }

    compareTo(other) {
        other = LocalDate.from(other);
        return this.value.localeCompare(other.value);
    }


    diff(other, unit = 'days') {
        this.ensureUnitValid(unit);
        other = LocalDate.from(other);
        return this.moment.diff(other.moment, unit);
    }

    //-------------------
    // Implementation
    //-------------------
    constructor(str) {
        this.value = str;
    }

    ensureUnitValid(unit) {
        // Units smaller than 'day'/'date' are irrelevant to LocalDate,
        unit = moment.normalizeUnits(unit);
        throwIf(
            !['year', 'quarter', 'month', 'week', 'day', 'date'].includes(unit),
            `Invalid unit for LocalDate: ${unit}`
        );
    }
}