/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


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


