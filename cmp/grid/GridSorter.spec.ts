/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridSorter} from '@xh/hoist/cmp/grid';
import {describe, expect, it} from 'vitest';

/**
 * GridSorter parsing and comparison. Grids persist their sort as GridSorter strings such as
 * 'pnl|desc|abs' in user prefs and saved views, so the string format must round-trip, and every
 * Hoist grid column sorts through these comparators.
 */
describe('GridSorter', () => {
    describe('parse', () => {
        it('parses the delimited string format and round-trips it via toString()', () => {
            const sorter = GridSorter.parse('pnl|desc|abs');

            expect(sorter).toMatchObject({colId: 'pnl', sort: 'desc', abs: true});
            expect(sorter.toString()).toBe('pnl|desc|abs');
            expect(GridSorter.parse('name').toString()).toBe('name|asc');
        });

        it('normalizes the sort direction, defaulting to ascending', () => {
            expect(GridSorter.parse({colId: 'name', sort: 'DESC'}).sort).toBe('desc');
            expect(GridSorter.parse({colId: 'name'}).sort).toBe('asc');
            expect(GridSorter.parse('name|bogus').sort).toBe('asc');
        });
    });

    describe('comparator', () => {
        it('sorts numbers by absolute value when abs is set', () => {
            const values = [-10, 5, -3, 1],
                absSorter = GridSorter.parse('pnl|asc|abs'),
                sorter = GridSorter.parse('pnl|asc');

            expect([...values].sort((a, b) => absSorter.comparator(a, b))).toEqual([1, -3, 5, -10]);
            expect([...values].sort((a, b) => sorter.comparator(a, b))).toEqual([-10, -3, 1, 5]);
        });
    });

    describe('defaultComparator', () => {
        it('sorts nulls ahead of all values', () => {
            expect([3, null, 1].sort(GridSorter.defaultComparator)).toEqual([null, 1, 3]);
            expect(GridSorter.defaultComparator(null, undefined)).toBe(0);
        });

        it('compares strings by locale, not by character code', () => {
            expect(['cherry', 'Banana', 'apple'].sort(GridSorter.defaultComparator)).toEqual([
                'apple',
                'Banana',
                'cherry'
            ]);
        });
    });
});
