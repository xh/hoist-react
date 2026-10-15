/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    type DateRangeContext,
    dateRangePresets,
    type DateRangeSelection,
    getDateRangeLabel,
    type LocalDateRange,
    parseDateRangeSelection,
    resolveDateRange,
    stepDateRangeSelection
} from '@xh/hoist/cmp/daterange';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {pick} from 'lodash';
import {describe, expect, it} from 'vitest';

/**
 * Resolution, validation, and stepping of DateRangePicker selections - relative lookbacks,
 * calendar periods, and custom ranges. The resolved dates feed the filters apps query with, and
 * selections persist as plain JSON that later releases must read back safely.
 */
describe('DateRangeUtils', () => {
    describe('resolveDateRange', () => {
        describe('relative', () => {
            const ctx = context('2026-09-02');

            it.each<[string, DateRangeSelection, Range, Range]>([
                [
                    'a rolling window of whole units ending on the anchor date',
                    {kind: 'relative', count: 3, unit: 'months'},
                    ['2026-06-03', '2026-09-02'],
                    ['2026-03-03', '2026-06-02']
                ],
                [
                    'a calendar window ending on the anchor date, counting the current unit as one',
                    {kind: 'relative', count: 3, unit: 'months', snap: true},
                    ['2026-07-01', '2026-09-02'],
                    ['2026-04-01', '2026-06-02']
                ],
                [
                    'a window of days ending on the anchor date',
                    {kind: 'relative', count: 5, unit: 'days'},
                    ['2026-08-29', '2026-09-02'],
                    ['2026-08-24', '2026-08-28']
                ]
            ])('resolves %s', (_, sel, current, prior) => {
                expect(resolve(sel, ctx)).toEqual({current, prior});
            });

            it('compares a window of months against the same months earlier, not the same days', () => {
                const sel: DateRangeSelection = {kind: 'relative', count: 3, unit: 'months'};

                expect(resolve(sel, context('2026-05-31'))).toEqual({
                    current: ['2026-03-01', '2026-05-31'],
                    prior: ['2025-12-01', '2026-02-28']
                });
            });
        });

        describe('month, quarter and year', () => {
            const ctx = context('2026-05-13');

            it.each<[string, DateRangeSelection, Range, Range]>([
                [
                    'a past month in full',
                    {kind: 'month', year: 2026, month: 3},
                    ['2026-03-01', '2026-03-31'],
                    ['2026-02-01', '2026-02-28']
                ],
                [
                    'the current month through maxDate',
                    {kind: 'month', year: 2026, month: 5},
                    ['2026-05-01', '2026-05-13'],
                    ['2026-04-01', '2026-04-13']
                ],
                [
                    'the current quarter through maxDate',
                    {kind: 'quarter', year: 2026, quarter: 2},
                    ['2026-04-01', '2026-05-13'],
                    ['2026-01-01', '2026-02-13']
                ],
                [
                    'the current year through maxDate',
                    {kind: 'year', year: 2026},
                    ['2026-01-01', '2026-05-13'],
                    ['2025-01-01', '2025-05-13']
                ],
                // E.g. a persisted pick from a user whose anchor date was later.
                [
                    'a month after maxDate in full, rather than as an inverted range',
                    {kind: 'month', year: 2026, month: 8},
                    ['2026-08-01', '2026-08-31'],
                    ['2026-07-01', '2026-07-31']
                ]
            ])('resolves %s', (_, sel, current, prior) => {
                expect(resolve(sel, ctx)).toEqual({current, prior});
            });

            it('starts a period that contains minDate on minDate', () => {
                const minCtx = context('2026-05-13', {minDate: LocalDate.get('2026-03-10')});

                expect(resolve({kind: 'month', year: 2026, month: 3}, minCtx).current).toEqual([
                    '2026-03-10',
                    '2026-03-31'
                ]);
            });
        });

        describe('custom', () => {
            it('resolves its dates, comparing against the same number of days before', () => {
                const sel: DateRangeSelection = {
                    kind: 'custom',
                    start: '2026-08-10',
                    end: '2026-08-20'
                };

                expect(resolve(sel, context('2026-09-02'))).toEqual({
                    current: ['2026-08-10', '2026-08-20'],
                    prior: ['2026-07-30', '2026-08-09']
                });
            });
        });
    });

    describe('parseDateRangeSelection', () => {
        // Presets offered by a model - a token for any other preset is not valid.
        const presets = pick(dateRangePresets, ['mtd', 'ytd']);

        it.each<[string, unknown, DateRangeSelection]>([
            ['accepts a preset token', 'mtd', {kind: 'preset', token: 'mtd'}],
            ['rejects a token for a preset the model does not offer', 'prevYear', null],
            [
                'drops a zero offset from a preset',
                {kind: 'preset', token: 'ytd', offset: 0},
                {kind: 'preset', token: 'ytd'}
            ],
            ['rejects a fractional offset', {kind: 'preset', token: 'ytd', offset: 0.5}, null],
            [
                'defaults snap to false on a relative selection',
                {kind: 'relative', count: 6, unit: 'months'},
                {kind: 'relative', count: 6, unit: 'months', snap: false}
            ],
            [
                'drops snap from a relative selection in days',
                {kind: 'relative', count: 5, unit: 'days', snap: true},
                {kind: 'relative', count: 5, unit: 'days', snap: false}
            ],
            [
                'rejects a relative selection of zero units',
                {kind: 'relative', count: 0, unit: 'days'},
                null
            ],
            ['rejects a thirteenth month', {kind: 'month', year: 2026, month: 13}, null],
            ['rejects a year before 1900', {kind: 'year', year: 1899}, null],
            [
                'swaps the dates of a custom range given in reverse',
                {kind: 'custom', start: '2026-08-20', end: '2026-08-10'},
                {kind: 'custom', start: '2026-08-10', end: '2026-08-20'}
            ],
            [
                'rejects a custom range with an invalid date',
                {kind: 'custom', start: '2026-02-30', end: '2026-03-10'},
                null
            ],
            ['rejects an unknown kind', {kind: 'week', year: 2026, week: 12}, null]
        ])('%s', (_, raw, expected) => {
            expect(parseDateRangeSelection(raw, presets)).toEqual(expected);
        });
    });

    describe('stepDateRangeSelection', () => {
        const ctx = context('2026-05-13');

        it('steps periods by calendar unit, across year boundaries', () => {
            expect(step({kind: 'month', year: 2026, month: 1}, -1, ctx)).toEqual({
                kind: 'month',
                year: 2025,
                month: 12
            });
            expect(step({kind: 'quarter', year: 2026, quarter: 1}, -1, ctx)).toEqual({
                kind: 'quarter',
                year: 2025,
                quarter: 4
            });
        });

        it('stops periods at those containing maxDate and minDate', () => {
            const minCtx = context('2026-05-13', {minDate: LocalDate.get('2026-02-15')});

            expect(step({kind: 'month', year: 2026, month: 3}, 6, minCtx)).toEqual({
                kind: 'month',
                year: 2026,
                month: 5
            });
            expect(step({kind: 'month', year: 2026, month: 5}, 1, minCtx)).toBeNull();
            expect(step({kind: 'month', year: 2026, month: 4}, -6, minCtx)).toEqual({
                kind: 'month',
                year: 2026,
                month: 2
            });
            expect(step({kind: 'month', year: 2026, month: 2}, -1, minCtx)).toBeNull();
        });

        it('steps a relative window by its own units', () => {
            const sel: DateRangeSelection = {kind: 'relative', count: 3, unit: 'months'},
                back = step(sel, -1, ctx);

            expect(back).toEqual({...sel, offset: -1});
            expect(resolve(back, ctx).current).toEqual(resolve(sel, ctx).prior);
        });

        it('steps a custom range by its length in days', () => {
            const sel = custom('2026-05-01', '2026-05-07');

            expect(step(sel, -1, ctx)).toEqual(custom('2026-04-24', '2026-04-30'));
            expect(step(sel, -2, ctx)).toEqual(custom('2026-04-17', '2026-04-23'));
        });

        it('clamps a custom range at maxDate, keeping its length', () => {
            const clamped = step(custom('2026-05-04', '2026-05-10'), 1, ctx);

            expect(clamped).toEqual(custom('2026-05-07', '2026-05-13'));
            expect(step(clamped, 1, ctx)).toBeNull();
        });

        it('walks a single custom day by business day in businessDayMode', () => {
            const bizCtx = context('2026-05-13', {businessDayMode: true}),
                monday = custom('2026-05-11', '2026-05-11');

            expect(step(monday, -1, bizCtx)).toEqual(custom('2026-05-08', '2026-05-08'));
            expect(step(monday, -1, ctx)).toEqual(custom('2026-05-10', '2026-05-10'));
        });
    });

    describe('getDateRangeLabel', () => {
        it.each<[DateRangeSelection, string]>([
            [{kind: 'relative', count: 6, unit: 'months'}, 'Prev 6 Months'],
            // Once stepped, the dates locate the range - the label gives its length.
            [{kind: 'relative', count: 6, unit: 'months', offset: -1}, '6 Months'],
            [{kind: 'month', year: 2026, month: 8}, 'Aug 2026'],
            [{kind: 'quarter', year: 2026, quarter: 1}, 'Q1 2026'],
            [custom('2026-08-10', '2026-08-20'), 'Custom']
        ])('labels %j as %s', (sel, label) => {
            expect(getDateRangeLabel(sel, context('2026-09-02'))).toBe(label);
        });
    });
});

//------------------
// Test support
//------------------
/** A range as `[start, end]` ISO dates, with null for an open edge. */
type Range = [string, string];

function context(anchor: string, opts: Partial<DateRangeContext> = {}): DateRangeContext {
    const anchorDate = LocalDate.get(anchor);
    return {
        anchorDate,
        today: anchorDate,
        minDate: null,
        maxDate: anchorDate,
        isBusinessDay: d => d.isWeekday,
        businessDayMode: false,
        presets: dateRangePresets,
        ...opts
    };
}

function resolve(sel: DateRangeSelection, ctx: DateRangeContext) {
    const {current, prior} = resolveDateRange(sel, ctx);
    return {current: toRange(current), prior: toRange(prior)};
}

function toRange(range: LocalDateRange): Range {
    return range ? [range.start?.isoString ?? null, range.end?.isoString ?? null] : null;
}

const step = stepDateRangeSelection;

function custom(start: string, end: string): DateRangeSelection {
    return {kind: 'custom', start, end};
}
