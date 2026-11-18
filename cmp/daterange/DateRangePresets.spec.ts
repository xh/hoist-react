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
    resolveDateRange,
    stepDateRangeSelection
} from '@xh/hoist/cmp/daterange';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {describe, expect, it} from 'vitest';

/**
 * The presets Hoist ships for DateRangePicker: the range each resolves to, the prior range it
 * compares against, and how it steps and labels. Apps filter and compare data by these ranges, so
 * an off-by-one day here silently changes the numbers users see.
 *
 * Week presets (`wtd`, `prevWeek`) are not covered - their week start follows moment's locale.
 */
describe('dateRangePresets', () => {
    // A Wednesday, mid-month and mid-quarter.
    const ctx = context('2026-05-13');

    describe('resolve', () => {
        // Stepping back once must land on the prior range - "the prior period is one step back".
        it.each<[string, Range, Range]>([
            ['anchorDay', ['2026-05-13', '2026-05-13'], ['2026-05-12', '2026-05-12']],
            ['prevDay', ['2026-05-12', '2026-05-12'], ['2026-05-11', '2026-05-11']],
            ['mtd', ['2026-05-01', '2026-05-13'], ['2026-04-01', '2026-04-13']],
            ['qtd', ['2026-04-01', '2026-05-13'], ['2026-01-01', '2026-02-13']],
            ['ytd', ['2026-01-01', '2026-05-13'], ['2025-01-01', '2025-05-13']],
            ['prev30Days', ['2026-04-14', '2026-05-13'], ['2026-03-15', '2026-04-13']],
            ['prev3Months', ['2026-02-14', '2026-05-13'], ['2025-11-14', '2026-02-13']],
            ['prev12Months', ['2025-05-14', '2026-05-13'], ['2024-05-14', '2025-05-13']],
            ['prevMonth', ['2026-04-01', '2026-04-30'], ['2026-03-01', '2026-03-31']],
            ['prevQuarter', ['2026-01-01', '2026-03-31'], ['2025-10-01', '2025-12-31']],
            ['prevYear', ['2025-01-01', '2025-12-31'], ['2024-01-01', '2024-12-31']]
        ])('resolves %s and its prior range, which is one step back', (token, current, prior) => {
            const sel: DateRangeSelection = {kind: 'preset', token};

            expect(resolve(sel, ctx)).toEqual({current, prior});
            expect(resolve({...sel, offset: -1}, ctx).current).toEqual(prior);
        });

        it('resolves all to an open start through maxDate, with no prior range', () => {
            const sel: DateRangeSelection = {kind: 'preset', token: 'all'};

            expect(resolve(sel, ctx)).toEqual({current: [null, '2026-05-13'], prior: null});
            expect(stepDateRangeSelection(sel, -1, ctx)).toBeNull();
        });

        it.each<[string, string, Range, Range]>([
            ['mtd', '2026-03-31', ['2026-03-01', '2026-03-31'], ['2026-02-01', '2026-02-28']],
            // Like against like - the three months before, not the 92 days before.
            [
                'prev3Months',
                '2026-05-31',
                ['2026-03-01', '2026-05-31'],
                ['2025-12-01', '2026-02-28']
            ],
            ['ytd', '2024-02-29', ['2024-01-01', '2024-02-29'], ['2023-01-01', '2023-02-28']]
        ])(
            'resolves %s at month end %s, ending its prior range on a shorter month',
            (token, anchor, current, prior) => {
                expect(resolve({kind: 'preset', token}, context(anchor))).toEqual({current, prior});
            }
        );
    });

    describe('businessDayMode', () => {
        it('steps single days over non-business days', () => {
            // Monday, after a Friday holiday.
            const holiday = LocalDate.get('2026-05-08'),
                bizCtx = context('2026-05-11', {
                    businessDayMode: true,
                    isBusinessDay: d => d.isWeekday && d !== holiday
                });

            expect(resolve({kind: 'preset', token: 'anchorDay'}, bizCtx).prior).toEqual(
                day('2026-05-07')
            );
            expect(resolve({kind: 'preset', token: 'prevDay'}, bizCtx)).toEqual({
                current: day('2026-05-07'),
                prior: day('2026-05-06')
            });
            // Windows of days keep their calendar length.
            expect(resolve({kind: 'preset', token: 'prev30Days'}, bizCtx).current).toEqual([
                '2026-04-12',
                '2026-05-11'
            ]);
        });
    });

    describe('stepping', () => {
        it('steps mtd back to the prior month to date, and forward to its natural range', () => {
            const mtd: DateRangeSelection = {kind: 'preset', token: 'mtd'},
                back = stepDateRangeSelection(mtd, -1, ctx);

            expect(back).toEqual({kind: 'preset', token: 'mtd', offset: -1});
            expect(resolve(back, ctx).current).toEqual(['2026-04-01', '2026-04-13']);
            expect(stepDateRangeSelection(back, 1, ctx)).toEqual(mtd);
        });

        it('does not step forward past maxDate', () => {
            expect(stepDateRangeSelection({kind: 'preset', token: 'mtd'}, 1, ctx)).toBeNull();
            expect(stepDateRangeSelection({kind: 'preset', token: 'prevMonth'}, 1, ctx)).toBeNull();
        });

        it('steps forward when maxDate allows dates beyond the anchor', () => {
            const futureCtx = context('2026-05-13', {maxDate: LocalDate.get('2026-12-31')}),
                next = stepDateRangeSelection({kind: 'preset', token: 'prevMonth'}, 2, futureCtx);

            expect(next).toEqual({kind: 'preset', token: 'prevMonth', offset: 2});
            expect(resolve(next, futureCtx).current).toEqual(['2026-06-01', '2026-06-30']);
        });
    });

    describe('labels', () => {
        it.each<[Partial<DateRangeSelection>, string]>([
            // A preset that names a period reads as that period, as a pick of the month would.
            [{token: 'prevMonth'}, 'Apr 2026'],
            // Once stepped, the dates locate the range - the label gives its shape.
            [{token: 'mtd', offset: -1}, 'MTD −1'],
            [{token: 'prevMonth', offset: -1}, 'Mar 2026'],
            [{token: 'prev30Days', offset: -1}, '30 Days'],
            // Single days read from the anchor day in the T-1 idiom, however the walk began.
            [{token: 'anchorDay', offset: -2}, 'Today −2'],
            [{token: 'prevDay', offset: -1}, 'Today −2']
        ])('labels %j as %s', (sel, label) => {
            expect(getDateRangeLabel({kind: 'preset', ...sel} as DateRangeSelection, ctx)).toBe(
                label
            );
        });

        it('labels the anchor day As Of, not Today, when it is not the current day', () => {
            const asOfCtx = context('2026-05-13', {today: LocalDate.get('2026-05-14')});

            expect(getDateRangeLabel({kind: 'preset', token: 'anchorDay'}, asOfCtx)).toBe('As Of');
            expect(getDateRangeLabel({kind: 'preset', token: 'prevDay', offset: -1}, asOfCtx)).toBe(
                'As Of −2'
            );
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

function day(iso: string): Range {
    return [iso, iso];
}
