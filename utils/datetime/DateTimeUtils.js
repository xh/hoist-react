/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import moment from 'moment';


export const
    MILLISECONDS = 1,
    SECONDS = 1000,
    MINUTES = 1000 * 60,
    HOURS = 1000 * 60 * 60,
    DAYS = 1000 * 60 * 60 * 24,
    ONE_SECOND = SECONDS,
    ONE_MINUTE = MINUTES,
    ONE_HOUR = HOURS,
    ONE_DAY = DAYS;

/**
 * Is a Date or UTC time stamp older than a certain amount?
 * Returns true if input time is null.
 */
export function olderThan(t, millis) {
    return !t || t < Date.now() - millis;
}

/**
* Returns a JS date set to the first millisecond of the current day
*/
export function startOfToday() {
    return moment().set({'hour': 0, 'minute': 0, 'second': 0, 'millisecond': 1}).toDate();
}

/**
* Returns a JS date set to the last millisecond of the current day
*/
export function endOfToday() {
    return moment().set({'hour': 23, 'minute': 59, 'second': 59, 'millisecond': 999}).toDate();
}
