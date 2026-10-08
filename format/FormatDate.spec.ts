/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    dateRenderer,
    fmtCompactDate,
    fmtDate,
    fmtDateTime,
    fmtDateTimeSec,
    fmtTime,
    withFormattedTimestamps,
    dateFormatter,
    dateTimeFormatter
} from '@xh/hoist/format';
import {LocalDate} from '@xh/hoist/utils/datetime';
import moment from 'moment';
import {isValidElement, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';

/**
 * Date formatters render dates in grids, forms and displays across every app. These tests pin the
 * default formats, the accepted input types, null and invalid input, tooltips, and the
 * clock-dependent choice of format in fmtCompactDate.
 */

/** Markup of a rendered element, or a string as-is. */
function html(node: ReactNode): string {
    return isValidElement(node) ? renderToStaticMarkup(node) : (node as string);
}

/** Freeze the clock at noon on Sunday, Feb 8 2026. */
function freezeNow() {
    vi.useFakeTimers({toFake: ['Date']});
    vi.setSystemTime(new Date(2026, 1, 8, 12));
}

describe('fmtDate', () => {
    const date = new Date(2026, 1, 8, 15, 45, 30);

    it('applies the default format of each date formatter', () => {
        expect(fmtDate(date)).toBe('2026-02-08');
        expect(fmtDateTime(date)).toBe('2026-02-08 3:45pm');
        expect(fmtDateTimeSec(date)).toBe('2026-02-08 3:45:30pm');
        expect(fmtTime(date)).toBe('3:45pm');
    });

    it('accepts a format string in place of options', () => {
        expect(fmtDate(date, 'MMM D, YYYY')).toBe('Feb 8, 2026');
        expect(fmtDateTime(date, 'HH:mm')).toBe('15:45');
        expect(dateRenderer('ddd MMM D')(date)).toBe('Sun Feb 8');
    });

    // 59bcd170c: string input was returned as-is, without parsing or formatting.
    it.each([
        ['a Date', date],
        ['a timestamp', date.getTime()],
        ['an ISO date string', '2026-02-08'],
        ['a moment', moment(date)],
        ['a LocalDate', LocalDate.get('2026-02-08')]
    ])('formats %s', (_, v) => {
        expect(fmtDate(v)).toBe('2026-02-08');
    });

    it('returns nullDisplay for null input', () => {
        expect(fmtDate(null)).toBe('');
        expect(fmtDate(undefined, {nullDisplay: '-'})).toBe('-');
        expect(fmtDateTime(null, {nullDisplay: '-'})).toBe('-');
    });

    // 802845cc3: invalid dates rendered as 'Invalid date'.
    it('returns an empty string for an invalid date', () => {
        expect(fmtDate(new Date(NaN))).toBe('');
        expect(fmtDateTime(new Date(NaN))).toBe('');
    });

    it('adds a tooltip generated from the original value', () => {
        const tooltip = vi.fn(() => 'tip');
        expect(html(fmtDateTime(date, {tooltip}))).toBe(
            '<span class="xh-title-tip" title="tip">2026-02-08 3:45pm</span>'
        );
        expect(tooltip).toHaveBeenCalledWith(date);
        expect(fmtDateTime(date, {tooltip, asHtml: true})).toBeTypeOf('string');
    });
});

describe('fmtCompactDate', () => {
    beforeEach(freezeNow);

    it.each([
        {when: 'a time today', date: new Date(2026, 1, 8, 15, 45), expected: '3:45pm'},
        {when: 'yesterday', date: new Date(2026, 1, 7, 15), expected: 'Feb 7'},
        {when: 'a day last month', date: new Date(2026, 0, 15, 10), expected: 'Jan 15'},
        {when: 'a day in three months', date: new Date(2026, 4, 15, 10), expected: 'May 15'},
        {when: 'a day a year ago', date: new Date(2025, 2, 22, 10), expected: '2025-03-22'},
        {when: 'a day a year ahead', date: new Date(2027, 0, 15, 10), expected: '2027-01-15'}
    ])('formats $when as "$expected"', ({date, expected}) => {
        expect(fmtCompactDate(date)).toBe(expected);
    });

    // #2470: a LocalDate has no time of day to show.
    it('formats a LocalDate for today as a month and day', () => {
        expect(fmtCompactDate(LocalDate.today())).toBe('Feb 8');
    });

    it('applies a custom format for each distance', () => {
        expect(fmtCompactDate(new Date(2026, 1, 8, 9), {sameDayFmt: '[Today]'})).toBe('Today');
        expect(fmtCompactDate(new Date(2026, 1, 1, 9), {nearFmt: 'MMM DD'})).toBe('Feb 01');
        expect(fmtCompactDate(new Date(2020, 1, 1, 9), {distantFmt: 'MMM DD YYYY'})).toBe(
            'Feb 01 2020'
        );
    });

    it('passes the original LocalDate to a tooltip function', () => {
        const day = LocalDate.get('2026-01-15'),
            tooltip = vi.fn(() => 'tip');
        expect(html(fmtCompactDate(day, {tooltip}))).toBe(
            '<span class="xh-title-tip" title="tip">Jan 15</span>'
        );
        expect(tooltip).toHaveBeenCalledWith(day);
    });

    // Fixed in 89.0.0 - nullDisplay was not passed on to fmtDate.
    it('returns nullDisplay for null input', () => {
        expect(fmtCompactDate(null, {nullDisplay: '-'})).toBe('-');
    });

    // Fixed in 89.0.0 - the near-future cutoff kept the current time of day, so with the clock at
    // noon, 9am on Aug 1 was 'near' and 6pm the same day was 'distant'.
    it('formats every time on the same day the same way', () => {
        const morning = new Date(2026, 7, 1, 9),
            evening = new Date(2026, 7, 1, 18);
        expect(fmtCompactDate(evening)).toBe(fmtCompactDate(morning));
    });
});

describe('withFormattedTimestamps', () => {
    const ts = new Date(2026, 1, 8, 9, 30, 15, 250).getTime(),
        formatted = 'Feb 08 09:30:15.250';

    beforeEach(freezeNow);

    it('formats timestamps under keys ending in time, date or timestamp', () => {
        const obj = {
            startTime: ts,
            Timestamp: ts,
            nested: {endDate: ts},
            items: [{fooTime: ts}],
            count: ts,
            strDate: '2026-01-01'
        };
        expect(withFormattedTimestamps(obj)).toEqual({
            startTime: formatted,
            Timestamp: formatted,
            nested: {endDate: formatted},
            items: [{fooTime: formatted}],
            count: ts,
            strDate: '2026-01-01'
        });
    });

    it('leaves durations and other small values as numbers', () => {
        expect(withFormattedTimestamps({elapsedTime: 1500})).toEqual({elapsedTime: 1500});
    });

    it('matches only the suffixes given', () => {
        const obj = {lastUpdated: ts, startTime: ts};
        expect(withFormattedTimestamps(obj, {suffixes: ['Updated']})).toEqual({
            lastUpdated: formatted,
            startTime: ts
        });
    });

    // Fixed in 89.0.0 - timestampReplacer ignored config.format.
    it('applies the configured format', () => {
        expect(withFormattedTimestamps({startTime: ts}, {format: 'YYYY-MM-DD'})).toEqual({
            startTime: '2026-02-08'
        });
    });
});

describe('dateFormatter', () => {
    const date = moment('2026-10-07 14:05:09').toDate();

    it('formats to a string with a format option or a bare format', () => {
        expect(dateFormatter()(date)).toBe('2026-10-07');
        expect(dateFormatter('MMM D')(date)).toBe('Oct 7');
        expect(dateFormatter({fmt: 'YYYY'})(date)).toBe('2026');
        expect(dateTimeFormatter()(date)).toBe('2026-10-07 2:05pm');
    });

    it('returns a string for null and invalid input', () => {
        expect(dateFormatter()(null)).toBe('');
        expect(dateFormatter({nullDisplay: '-'})(null)).toBe('-');
        expect(dateFormatter()('not a date')).toBe('');
    });
});
