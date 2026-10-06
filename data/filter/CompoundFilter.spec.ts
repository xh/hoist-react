/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    CompoundFilter,
    parseFilter,
    type CompoundFilterSpec,
    type FieldFilterSpec,
    type FilterTestFn
} from '@xh/hoist/data';
import {describe, expect, it} from 'vitest';

/**
 * CompoundFilter evaluation, clause removal, equality and persistence. Several sources can share
 * one Store filter - grid column filters, a StoreFilterField search, a FilterChooser - and each one
 * edits only its own clauses with removeFieldFilters() and removeFunctionFilters().
 */
describe('CompoundFilter', () => {
    const status = parseFilter({field: 'status', op: '=', value: 'open'}),
        region = parseFilter({field: 'region', op: '=', value: 'US'}),
        search = parseFilter({key: 'default', testFn: () => true}),
        other = parseFilter({key: 'other', testFn: () => true});

    const nestedSpec: CompoundFilterSpec = {
        op: 'OR',
        filters: [
            {field: 'status', op: '=', value: ['open', 'pending']},
            {op: 'AND', filters: [region, {field: 'qty', op: '>', value: 10}]}
        ]
    };

    describe('getTestFn', () => {
        it('requires every clause to pass for AND, and any clause for OR', () => {
            const rows = [
                {dept: 'Eng', salary: 60},
                {dept: 'Eng', salary: 40},
                {dept: 'Ops', salary: 60},
                {dept: 'Ops', salary: 40}
            ];
            const filters: FieldFilterSpec[] = [
                {field: 'dept', op: '=', value: 'Eng'},
                {field: 'salary', op: '>=', value: 50}
            ];

            const and = parseFilter({op: 'AND', filters}).getTestFn(),
                or = parseFilter({op: 'OR', filters}).getTestFn();
            expect(rows.filter(and)).toEqual([rows[0]]);
            expect(rows.filter(or)).toEqual(rows.slice(0, 3));
        });

        it('evaluates nested filters', () => {
            const rows = [
                {active: true, role: 'admin'},
                {active: true, role: 'manager'},
                {active: true, role: 'viewer'},
                {active: false, role: 'admin'}
            ];
            const test = parseFilter({
                op: 'AND',
                filters: [
                    {field: 'active', op: '=', value: true},
                    {
                        op: 'OR',
                        filters: [
                            {field: 'role', op: '=', value: 'admin'},
                            {field: 'role', op: '=', value: 'manager'}
                        ]
                    }
                ]
            }).getTestFn();
            expect(rows.filter(test)).toEqual(rows.slice(0, 2));
        });
    });

    describe('removeFieldFilters', () => {
        it('removes clauses on the given field, including within nested filters', () => {
            const statusOrRegion = parseFilter({
                    op: 'OR',
                    filters: [region, {field: 'status', op: 'like', value: 'pend'}]
                }),
                filter = parseFilter([status, statusOrRegion, search]);

            // The nested OR collapses to its one remaining clause.
            const result = filter.removeFieldFilters('status') as CompoundFilter;
            expect(result.op).toBe('AND');
            expect(result.filters).toEqual([region, search]);
        });

        // GridFilterModel.clear() relies on this to leave a StoreFilterField search in place.
        it('removes every FieldFilter when given no field, keeping FunctionFilters', () => {
            expect(parseFilter([status, region, search]).removeFieldFilters()).toBe(search);
            expect(parseFilter([status, region]).removeFieldFilters()).toBeNull();
        });

        it('returns the same instance when nothing is removed', () => {
            const filter = parseFilter([status, search]);
            expect(filter.removeFieldFilters('region')).toBe(filter);
        });
    });

    describe('removeFunctionFilters', () => {
        // StoreFilterField replaces its own search this way, under the key 'default'.
        it('removes FunctionFilters with the given key, keeping all other clauses', () => {
            const filter = parseFilter([status, search, other]);

            const result = filter.removeFunctionFilters('default') as CompoundFilter;
            expect(result.filters).toEqual([status, other]);
            expect(filter.removeFunctionFilters()).toBe(status);
        });
    });

    describe('equals', () => {
        it('compares nested clauses by value', () => {
            const filter = parseFilter(nestedSpec);
            expect(filter.equals(parseFilter(nestedSpec))).toBe(true);
            expect(filter.equals(parseFilter({...nestedSpec, op: 'AND'}))).toBe(false);

            const changedNested: CompoundFilterSpec = {
                ...nestedSpec,
                filters: [nestedSpec.filters[0], {op: 'AND', filters: [region]}]
            };
            expect(filter.equals(parseFilter(changedNested))).toBe(false);
        });

        // StoreFilterField builds a new testFn for each search, under the same key. If those were
        // equal, Store.setFilter() would skip each new search as a no-op.
        it('treats FunctionFilters as equal only when they share a testFn', () => {
            const testFn: FilterTestFn = () => true,
                withSearch = (fn: FilterTestFn) =>
                    parseFilter([status, {key: 'default', testFn: fn}]);

            expect(withSearch(testFn).equals(withSearch(testFn))).toBe(true);
            expect(withSearch(testFn).equals(withSearch(() => true))).toBe(false);
        });
    });

    describe('toJSON', () => {
        // FilterChooser persists its value and favorites this way.
        it('round-trips nested filters through JSON', () => {
            const filter = parseFilter(nestedSpec),
                restored = parseFilter(JSON.parse(JSON.stringify(filter)));

            expect(restored).toBeInstanceOf(CompoundFilter);
            expect(restored.equals(filter)).toBe(true);
        });
    });
});
