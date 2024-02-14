/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {isDate, isNil} from 'lodash';
import moment from 'moment';

export const MILLISECONDS = 1,
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
export function olderThan(t: Date | number, millis: number) {
    if (isNil(t)) return true;
    t = isDate(t) ? t.getTime() : t;
    return t < Date.now() - millis;
}

/** Returns midnight browser local time for the provided date, or current date. */
export function startOfDay(date: Date = new Date()) {
    return moment(date).startOf('day').toDate();
}

/** Returns 11:59:59pm browser local time for the provided date, or current date. */
export function endOfDay(date: Date = new Date()) {
    return moment(date).endOf('day').toDate();
}
