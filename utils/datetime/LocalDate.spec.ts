/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {LocalDate} from '@xh/hoist/utils/datetime';
import moment from 'moment';
import {describe, expect, it, vi} from 'vitest';

/**
 * LocalDate calendar math, parsing, and the memoized-instance contract. Apps use LocalDate for
 * trade, maturity and invoice dates, and compare instances with `===`, so a broken factory or
 * month-end rule silently shifts business dates. Many cases are ported from the expected-vs-actual
 * page that Toolbox has long kept for manual checks.
 *
 * Tests run in America/New_York (see vitest.config.mts), which fixes the DST and time zone cases.
 */
describe('LocalDate', () => {
    // Not `LocalDate.get` itself - the static factory needs `this`.
    const day = (s: string) => LocalDate.get(s);

    describe('factories', () => {
        it('returns one shared instance per day for YYYY-MM-DD and YYYYMMDD strings', () => {
            // Hyphenated input accepted since v45 (#2847).
            const d = LocalDate.get('2019-01-01');
            expect(d.isoString).toBe('2019-01-01');
            expect(LocalDate.get('20190101')).toBe(d);
            expect(LocalDate.get('2019-01-01')).toBe(d);
        });

        it('resolves a Date, moment, date string or LocalDate to the instance for its day', () => {
            const d = day('2019-01-01');
            expect(LocalDate.from(new Date(2019, 0, 1))).toBe(d);
            expect(LocalDate.from(new Date(2019, 0, 1, 23, 59))).toBe(d);
            expect(LocalDate.from(moment('20190101'))).toBe(d);
            expect(LocalDate.from('2019-01-01')).toBe(d);
            expect(LocalDate.from(d)).toBe(d);
        });

        it('resolves a timestamp to its calendar day in the browser time zone', () => {
            // The instant is converted to local time first, so 02:00Z is 22:00 the day before in
            // New York. today() and currentAppDay() rely on this for timestamps.
            expect(LocalDate.from('2025-09-15T14:30:00Z')).toBe(day('2025-09-15'));
            expect(LocalDate.from('2025-09-15T02:00:00Z')).toBe(day('2025-09-14'));
            expect(LocalDate.from(Date.UTC(2025, 8, 15, 2))).toBe(day('2025-09-14'));
        });

        it('passes null and undefined through', () => {
            // Nil-safe since v41 (fdd7d16a0), for optional dates in server data.
            expect(LocalDate.get(null)).toBeNull();
            expect(LocalDate.get(undefined)).toBeUndefined();
            expect(LocalDate.from(null)).toBeNull();
            expect(LocalDate.from(undefined)).toBeUndefined();
        });

        it.each([
            ['a slash-separated date', '2025/09/15'],
            ['an unpadded month', '2025-9-15'],
            ['an impossible day', '2025-02-30'],
            ['an impossible month', '20251301'],
            ['a number', 20250915]
        ])('get() throws on %s', (_, input) => {
            expect(() => LocalDate.get(input as string)).toThrow();
        });
    });

    describe('today', () => {
        it('follows the browser clock, rolling over at local midnight', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2025, 8, 15, 23, 59, 59));
            const today = LocalDate.today();
            expect(today).toBe(day('2025-09-15'));
            expect(LocalDate.tomorrow()).toBe(day('2025-09-16'));
            expect(LocalDate.yesterday()).toBe(day('2025-09-14'));
            expect(today.isToday).toBe(true);

            vi.setSystemTime(new Date(2025, 8, 16, 0, 0, 1));
            expect(LocalDate.today()).toBe(day('2025-09-16'));
            expect(today.isToday).toBe(false);
            expect(day('2025-09-16').isToday).toBe(true);
        });
    });

    describe('serialization', () => {
        it('converts to its ISO date as JSON, as a string and as a primitive value', () => {
            // ISO is the default output since v46 (#2854). Apps send LocalDates in JSON as-is.
            const d = day('20250915');
            expect(JSON.stringify({d})).toBe('{"d":"2025-09-15"}');
            expect(`${d}`).toBe('2025-09-15');
            expect(d.valueOf()).toBe('2025-09-15');
        });
    });

    describe('comparison', () => {
        it('orders instances chronologically', () => {
            expect(day('2019-06-01') > day('2019-01-01')).toBe(true);
            expect(day('2019-06-01') < day('2019-01-01')).toBe(false);
            expect(day('2025-01-02') > day('2024-12-31')).toBe(true);
            expect(day('2019-01-01') <= day('2019-01-01')).toBe(true);

            const dates = [day('2025-01-02'), day('2024-12-31'), day('2025-01-01')];
            expect(dates.sort().map(String)).toEqual(['2024-12-31', '2025-01-01', '2025-01-02']);
        });
    });

    describe('add and subtract', () => {
        it('moves by days unless given another unit', () => {
            const d = day('2019-01-01');
            expect(d.add(1)).toBe(day('2019-01-02'));
            expect(d.subtract(1)).toBe(day('2018-12-31'));
            expect(d.add(2, 'weeks')).toBe(day('2019-01-15'));
            expect(d.add(1, 'month')).toBe(day('2019-02-01'));
            expect(d.subtract(1, 'month')).toBe(day('2018-12-01'));
            expect(d.add(1, 'quarter')).toBe(day('2019-04-01'));
            expect(d.subtract(1, 'years')).toBe(day('2018-01-01'));
        });

        it('clamps to the last day of a shorter month', () => {
            expect(day('2019-01-31').add(1, 'month')).toBe(day('2019-02-28'));
            expect(day('2020-01-31').add(1, 'month')).toBe(day('2020-02-29'));
            expect(day('2025-03-31').subtract(1, 'month')).toBe(day('2025-02-28'));
            expect(day('2025-08-31').add(1, 'quarter')).toBe(day('2025-11-30'));
            expect(day('2024-02-29').add(1, 'year')).toBe(day('2025-02-28'));
        });

        it('moves by calendar days across daylight saving changes', () => {
            // US clocks sprang forward on 2025-03-09 and fell back on 2025-11-02.
            expect(day('2025-03-09').add(1)).toBe(day('2025-03-10'));
            expect(day('2025-03-10').subtract(1)).toBe(day('2025-03-09'));
            expect(day('2025-11-02').add(1)).toBe(day('2025-11-03'));
            expect(day('2025-11-03').subtract(1)).toBe(day('2025-11-02'));
        });

        it('throws on units other than days, weeks, months, quarters and years', () => {
            // Ambiguous moment units such as 'd' and 'date' were dropped in v79 (#4184).
            const d = day('2025-09-15');
            expect(() => d.add(1, 'd' as any)).toThrow('Invalid unit');
            expect(() => d.subtract(1, 'date' as any)).toThrow('Invalid unit');
            expect(() => d.add(24, 'hours' as any)).toThrow('Invalid unit');
            expect(() => d.startOf('hour' as any)).toThrow('Invalid unit');
        });
    });

    describe('diff', () => {
        it('is positive when this date is later', () => {
            expect(day('2025-01-02').diff(day('2024-12-31'))).toBe(2);
            expect(day('2024-12-31').diff(day('2025-01-02'))).toBe(-2);
            expect(day('2025-04-01').diff(day('2025-01-01'), 'months')).toBe(3);
        });

        it('counts whole days across daylight saving changes', () => {
            expect(day('2025-03-10').diff(day('2025-03-08'))).toBe(2);
            expect(day('2025-11-03').diff(day('2025-11-01'))).toBe(2);
        });
    });

    describe('startOf and endOf', () => {
        it.each([
            ['2019-06-06', 'year', '2019-01-01', '2019-12-31'],
            ['2019-06-06', 'month', '2019-06-01', '2019-06-30'],
            ['2025-05-15', 'quarter', '2025-04-01', '2025-06-30'],
            ['2024-02-10', 'month', '2024-02-01', '2024-02-29'],
            ['2025-02-10', 'month', '2025-02-01', '2025-02-28']
        ] as const)('bounds %s by %s from %s to %s', (input, unit, start, end) => {
            expect(day(input).startOf(unit)).toBe(day(start));
            expect(day(input).endOf(unit)).toBe(day(end));
        });

        const boundaryFlags = [
            'isStartOfMonth',
            'isStartOfQuarter',
            'isStartOfYear',
            'isEndOfMonth',
            'isEndOfQuarter',
            'isEndOfYear'
        ] as const;

        it.each([
            ['2026-01-01', ['isStartOfMonth', 'isStartOfQuarter', 'isStartOfYear']],
            ['2025-07-01', ['isStartOfMonth', 'isStartOfQuarter']],
            ['2025-11-30', ['isEndOfMonth']],
            ['2025-12-31', ['isEndOfMonth', 'isEndOfQuarter', 'isEndOfYear']],
            ['2025-09-15', []]
        ])('flags %s as %j', (input, expected) => {
            const d = day(input);
            expect(boundaryFlags.filter(flag => d[flag])).toEqual(expected);
        });
    });

    describe('weekdays', () => {
        it.each([
            ['Thursday', '2019-08-08', '2019-08-09'],
            ['Friday', '2019-08-09', '2019-08-12'],
            ['Saturday', '2019-08-10', '2019-08-12'],
            ['Sunday', '2019-08-11', '2019-08-12']
        ])('nextWeekday() moves %s %s to %s', (dayName, input, expected) => {
            const d = day(input);
            expect(d.dayOfWeek()).toBe(dayName);
            expect(d.nextWeekday()).toBe(day(expected));
        });

        it.each([
            ['Tuesday', '2019-08-13', '2019-08-12'],
            ['Monday', '2019-08-12', '2019-08-09'],
            // Sunday went back only to Saturday before v36.2.1 (#2099).
            ['Sunday', '2019-08-11', '2019-08-09'],
            ['Saturday', '2019-08-10', '2019-08-09']
        ])('previousWeekday() moves %s %s to %s', (dayName, input, expected) => {
            const d = day(input);
            expect(d.dayOfWeek()).toBe(dayName);
            expect(d.previousWeekday()).toBe(day(expected));
        });

        it.each([
            ['2019-08-07', 5, '2019-08-14'],
            ['2019-08-10', 1, '2019-08-12'],
            ['2019-08-12', -1, '2019-08-09'],
            ['2019-08-07', 0, '2019-08-07']
        ])('moves %s by %i weekdays to %s', (input, n, expected) => {
            const d = day(input);
            expect(d.addWeekdays(n)).toBe(day(expected));
            expect(d.subtractWeekdays(-n)).toBe(day(expected));
        });

        it('keeps a weekday and moves a weekend day with currentOrNext/PreviousWeekday', () => {
            const wed = day('2019-08-07'),
                sat = day('2019-08-10');
            expect(wed.isWeekday).toBe(true);
            expect(wed.currentOrNextWeekday()).toBe(wed);
            expect(wed.currentOrPreviousWeekday()).toBe(wed);
            expect(sat.isWeekday).toBe(false);
            expect(sat.currentOrNextWeekday()).toBe(day('2019-08-12'));
            expect(sat.currentOrPreviousWeekday()).toBe(day('2019-08-09'));
        });
    });

    describe('date and moment', () => {
        it('return copies that callers can change without affecting the shared instance', () => {
            const d = day('2025-10-15');
            d.date.setFullYear(2000);
            d.moment.add(1, 'year');

            expect(d.date).toEqual(new Date(2025, 9, 15));
            expect(d.format('YYYY-MM-DD')).toBe('2025-10-15');
            expect(d.add(1)).toBe(day('2025-10-16'));
        });
    });
});
