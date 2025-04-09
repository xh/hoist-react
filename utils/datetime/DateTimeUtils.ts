/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {isDate, isNil, isFinite} from 'lodash';
import moment from 'moment';
import {PlainObject} from '@xh/hoist/core';
import {fmtDateTime} from '@xh/hoist/format';

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

export interface TimestampReplacerConfig {
    /**
     * Suffixes used to identify keys that may hold timestamps.
     * Defaults to ['time', 'date', 'timestamp']
     */
    suffixes?: string[];

    /**
     * Format for replaced timestamp.
     * Defaults to 'MMM DD HH:mm:ss.SSS'
     */
    format?: string;
}

/**
 * Replace timestamps in an Object with formatted strings.
 */
export function formatTimestamps(
    obj: PlainObject,
    config: TimestampReplacerConfig = {}
): PlainObject {
    return JSON.parse(JSON.stringify(obj, timestampReplacer(config)));
}

/**
 * Create a replacer, suitable for JSON.stringify, that will replace timestamps with
 * formatted strings.
 */
export function timestampReplacer(
    config: TimestampReplacerConfig = {}
): (k: string, v: any) => any {
    const suffixes = config.suffixes ?? ['time', 'date', 'timestamp'],
        fmt = 'MMM DD HH:mm:ss.SSS';
    return (k: string, v: any) => {
        return suffixes.some(s => k.toLowerCase().endsWith(s.toLowerCase())) &&
            isFinite(v) &&
            v > Date.now() - 25 * 365 * DAYS // heuristic to avoid catching smaller ms ranges
            ? fmtDateTime(v, {fmt})
            : v;
    };
}
