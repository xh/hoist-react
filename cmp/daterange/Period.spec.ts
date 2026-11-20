/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {parsePeriod, type Period, shiftByPeriod} from '@xh/hoist/cmp/daterange';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {describe, expect, it} from 'vitest';

/**
 * Periods such as `3M` or `+5D`, and the dates they reach from an anchor. Returns and rolling
 * windows start where a period lands, so a day off misstates every figure computed over it.
 */
describe('Period', () => {
    describe('parsePeriod', () => {
        it.each<[string, Period]>([
            ['3M', {count: 3, unit: 'months', forward: false}],
            ['+5D', {count: 5, unit: 'days', forward: true}],
            ['1W', {count: 1, unit: 'weeks', forward: false}],
            ['2Q', {count: 2, unit: 'quarters', forward: false}],
            ['+1Y', {count: 1, unit: 'years', forward: true}]
        ])('reads %s', (spec, expected) => {
            expect(parsePeriod(spec)).toEqual(expected);
        });

        it.each(['', '0M', 'M', '3X', '-3M', '3m', ' 3M', '1000D', '1.5M'])(
            'returns null for "%s"',
            spec => expect(parsePeriod(spec)).toBeNull()
        );

        it('returns null for a value that is not a string', () => {
            expect(parsePeriod(3 as any)).toBeNull();
            expect(parsePeriod(null)).toBeNull();
        });
    });

    describe('shiftByPeriod', () => {
        it.each([
            ['1M', '2026-09-07', '2026-08-07'],
            ['1M', '2026-09-08', '2026-08-07'],
            ['1M', '2026-03-31', '2026-02-27'],
            ['1Q', '2026-09-30', '2026-06-30'],
            ['+1M', '2026-07-08', '2026-08-10'],
            ['5D', '2026-09-07', '2026-08-31'],
            ['1D', '2026-09-06', '2026-09-04'],
            ['+1D', '2026-09-04', '2026-09-07']
        ])(
            'shifts by %s from %s to %s, landing on a business day in its direction',
            (spec, from, to) => {
                expect(shiftByPeriod(LocalDate.get(from), spec).isoString).toBe(to);
            }
        );

        it('gives the date one period back, where a return over it starts', () => {
            expect(shiftByPeriod(LocalDate.get('2026-09-02'), '1W').isoString).toBe('2026-08-26');
        });

        it('counts calendar days and keeps weekends with the calendar option', () => {
            const opts = {calendar: 'calendar'} as const;
            expect(shiftByPeriod(LocalDate.get('2026-09-07'), '5D', opts).isoString).toBe(
                '2026-09-02'
            );
            expect(shiftByPeriod(LocalDate.get('2026-09-08'), '1M', opts).isoString).toBe(
                '2026-08-08'
            );
        });

        it('lands on the business days a custom calendar allows', () => {
            const isBusinessDay = (d: LocalDate) => d.isWeekday && d.isoString !== '2026-08-07';
            expect(
                shiftByPeriod(LocalDate.get('2026-09-08'), '1M', {isBusinessDay}).isoString
            ).toBe('2026-08-06');
        });

        it('takes a parsed period, and throws for a spec it cannot read', () => {
            const period: Period = {count: 1, unit: 'weeks', forward: true};
            expect(shiftByPeriod(LocalDate.get('2026-09-02'), period).isoString).toBe('2026-09-09');
            expect(() => shiftByPeriod(LocalDate.get('2026-09-02'), '3X')).toThrow('3X');
        });
    });
});
