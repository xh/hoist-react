/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    appendFilter,
    CompoundFilter,
    FieldFilter,
    FunctionFilter,
    getFilterMatchRanges,
    getFilterRegex,
    parseFilter,
    type FieldFilterSpec,
    type FilterLike,
    type FilterMatchMode
} from '@xh/hoist/data';
import {describe, expect, it} from 'vitest';

/**
 * The filter utilities apps and Hoist components build on: parseFilter() normalizes every
 * FilterLike, appendFilter() combines filters from separate sources, and getFilterRegex() /
 * getFilterMatchRanges() define what a search term matches in StoreFilterField, GridFindField and
 * the column chooser.
 */
describe('parseFilter', () => {
    // v75.0.0 (f64bb98d8, #4044) - undefined passed through and threw in FilterChooserModel.
    it.each([
        ['null', null],
        ['undefined', undefined],
        ['an empty array', []],
        ['an array of nulls', [null, null]],
        ['a compound spec with no filters', {filters: []}]
    ])('returns null, for no filter, given %s', (_, spec: FilterLike) => {
        expect(parseFilter(spec)).toBeNull();
    });

    it("wraps a function as a FunctionFilter with the key 'default'", () => {
        const testFn = () => true,
            filter = parseFilter(testFn) as FunctionFilter;

        expect(filter).toBeInstanceOf(FunctionFilter);
        expect(filter.key).toBe('default');
        expect(filter.testFn).toBe(testFn);
    });

    it('combines an array with AND, and unwraps an array of one', () => {
        const status: FieldFilterSpec = {field: 'status', op: '=', value: 'open'},
            region: FieldFilterSpec = {field: 'region', op: '=', value: 'US'};

        const filter = parseFilter([status, region]) as CompoundFilter;
        expect(filter).toBeInstanceOf(CompoundFilter);
        expect(filter.op).toBe('AND');
        expect(filter.filters).toHaveLength(2);

        expect(parseFilter([status])).toBeInstanceOf(FieldFilter);
    });

    it('parses nested specs and arrays recursively', () => {
        const filter = parseFilter({
            op: 'or',
            filters: [
                {field: 'status', op: '=', value: 'open'},
                [
                    {field: 'region', op: '=', value: 'US'},
                    {field: 'qty', op: '>', value: 10}
                ]
            ]
        }) as CompoundFilter;

        expect(filter.op).toBe('OR');
        expect(filter.filters[0]).toBeInstanceOf(FieldFilter);
        expect(filter.filters[1]).toBeInstanceOf(CompoundFilter);
        expect((filter.filters[1] as CompoundFilter).op).toBe('AND');
    });
});

describe('appendFilter', () => {
    const status = parseFilter({field: 'status', op: '=', value: 'open'}),
        region = parseFilter({field: 'region', op: '=', value: 'US'}),
        qty = parseFilter({field: 'qty', op: '>', value: 10});

    it('returns the addition alone when there is no source', () => {
        expect(appendFilter(null, status)).toBe(status);
        expect(appendFilter(null, null)).toBeNull();
        expect(appendFilter(null)).toBeNull();
    });

    it('adds to the clauses of an AND source rather than nesting it', () => {
        const result = appendFilter(parseFilter([status, region]), qty) as CompoundFilter;
        expect(result.op).toBe('AND');
        expect(result.filters).toEqual([status, region, qty]);
    });

    it('adds an OR source as a single clause', () => {
        const or = parseFilter({op: 'OR', filters: [status, region]}),
            result = appendFilter(or, qty) as CompoundFilter;

        expect(result.op).toBe('AND');
        expect(result.filters).toEqual([or, qty]);
    });

    // v82.0.0 (8a39c238c, #4254) - the idiom GridFilterModel, StoreFilterField and FilterChooser
    // use to replace their own clauses in a filter they share with other sources.
    it("replaces one field's clauses when applied to the result of removeFieldFilters()", () => {
        const search = parseFilter({key: 'default', testFn: () => true}),
            filter = parseFilter([status, region, search]),
            newStatus: FieldFilterSpec = {field: 'status', op: '=', value: ['open', 'pending']};

        // One flat AND - not a compound nested inside another.
        const updated = appendFilter(filter.removeFieldFilters('status'), newStatus);
        expect(updated.equals(parseFilter([region, search, newStatus]))).toBe(true);

        const cleared = appendFilter(updated.removeFieldFilters('status'), null);
        expect(cleared.equals(parseFilter([region, search]))).toBe(true);
    });
});

describe('getFilterRegex', () => {
    it.each<{mode: FilterMatchMode; matches: string[]; misses: string[]}>([
        {mode: 'any', matches: ['Bar', 'foobar'], misses: ['b-ar']},
        {mode: 'start', matches: ['Barn'], misses: ['foobar', 'foo bar']},
        {mode: 'startWord', matches: ['Barn', 'foo bar', 'foo-bar'], misses: ['foobar']}
    ])("matches 'bar' case-insensitively in $mode mode", ({mode, matches, misses}) => {
        const regex = getFilterRegex('bar', mode);
        expect(matches.filter(it => regex.test(it))).toEqual(matches);
        expect(misses.filter(it => regex.test(it))).toEqual([]);
    });

    it('matches regex metacharacters in the search term literally', () => {
        expect(getFilterRegex('c++', 'any').test('C++ developer')).toBe(true);
        expect(getFilterRegex('a.b', 'any').test('axb')).toBe(false);
        expect(getFilterRegex('(draft', 'startWord').test('memo (draft)')).toBe(true);
    });
});

describe('getFilterMatchRanges', () => {
    it('returns the [start, end) range of each match', () => {
        expect(getFilterMatchRanges('banana', 'AN', 'any')).toEqual([
            [1, 3],
            [3, 5]
        ]);
        expect(getFilterMatchRanges('abab', 'ab', 'start')).toEqual([[0, 2]]);
    });

    // v87.0.0 (797992267) - the startWord regex also matches the boundary char before the term.
    it('excludes the preceding word boundary from startWord ranges', () => {
        expect(getFilterMatchRanges('bar baz-bat', 'ba', 'startWord')).toEqual([
            [0, 2],
            [4, 6],
            [8, 10]
        ]);
    });
});
