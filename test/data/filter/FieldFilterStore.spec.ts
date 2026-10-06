/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {
    parseFilter,
    Store,
    type FieldFilterOperator,
    type FieldFilterSpec,
    type FieldSpec,
    type StoreRecord
} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {isArray, sortBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * FieldFilter applied to a Store's records, where it reads the store's field types. Grid column
 * filters and FilterChooser always filter this way. Covers type coercion, calendar-day matching on
 * timestamp fields, blank tags, and records with uncommitted edits.
 */
describe('FieldFilter', () => {
    beforeAll(() => initTestAppAsync());

    describe('filtering a Store', () => {
        it('coerces filter values to the field type', () => {
            // A filter built from text input, e.g. a route param, holds numbers or dates as text.
            const store = createStore(
                [
                    {name: 'qty', type: 'number'},
                    {name: 'day', type: 'localDate'}
                ],
                [
                    {id: 1, qty: 5, day: '2023-05-31'},
                    {id: 2, qty: 25, day: '2023-06-01'}
                ]
            );
            expect(idsPassing(store, {field: 'qty', op: '=', value: '5'})).toEqual([1]);
            expect(idsPassing(store, {field: 'qty', op: '=', value: ['5', '25']})).toEqual([1, 2]);
            expect(idsPassing(store, {field: 'day', op: '=', value: '2023-06-01'})).toEqual([2]);
        });

        // v86.1.0 (e6facb56c, #3338) - these compared against midnight, so '> 2023-05-31'
        // included most of the 31st and '= 2023-05-31' matched only midnight.
        describe('on a timestamp field with LocalDate values', () => {
            const data = [
                {id: 1, ts: new Date(2023, 4, 30, 23, 59, 59)},
                {id: 2, ts: new Date(2023, 4, 31, 0, 0)},
                {id: 3, ts: new Date(2023, 4, 31, 12, 0)},
                {id: 4, ts: new Date(2023, 4, 31, 23, 59, 59, 999)},
                {id: 5, ts: new Date(2023, 5, 1, 0, 0)},
                {id: 6, ts: null}
            ];

            it.each<[FieldFilterOperator, string | string[], number[]]>([
                ['=', '2023-05-31', [2, 3, 4]],
                ['!=', '2023-05-31', [1, 5, 6]],
                ['>', '2023-05-31', [5]],
                ['>=', '2023-05-31', [2, 3, 4, 5]],
                ['<', '2023-05-31', [1]],
                ['<=', '2023-05-31', [1, 2, 3, 4]],
                ['=', ['2023-05-30', '2023-06-01'], [1, 5]]
            ])('%s %s compares whole calendar days', (op, days, expected) => {
                const store = createStore([{name: 'ts', type: 'date'}], data),
                    value = isArray(days) ? days.map(d => LocalDate.get(d)) : LocalDate.get(days);
                expect(idsPassing(store, {field: 'ts', op, value})).toEqual(expected);
            });

            it('finds day bounds by calendar across daylight saving changes', () => {
                const store = createStore(
                    [{name: 'ts', type: 'date'}],
                    [
                        // In New York, 2023-03-12 is 23 hours long and 2023-11-05 is 25 hours long.
                        {id: 1, ts: new Date(2023, 2, 13, 0, 30)},
                        {id: 2, ts: new Date(2023, 10, 5, 23, 30)}
                    ]
                );
                const matching = (day: string) =>
                    idsPassing(store, {field: 'ts', op: '=', value: LocalDate.get(day)});

                expect(matching('2023-03-12')).toEqual([]);
                expect(matching('2023-03-13')).toEqual([1]);
                expect(matching('2023-11-05')).toEqual([2]);
            });
        });

        // v86.1.0 (d96137190) - empty arrays failed "Is blank" and matched "Is not blank".
        it('treats empty tags as blank', () => {
            const store = createStore(
                [{name: 'tags', type: 'tags'}],
                [
                    {id: 1, tags: ['a', 'b']},
                    {id: 2, tags: []},
                    {id: 3, tags: null},
                    {id: 4, tags: ['c']}
                ]
            );
            expect(idsPassing(store, {field: 'tags', op: '=', value: null})).toEqual([2, 3]);
            expect(idsPassing(store, {field: 'tags', op: '!=', value: null})).toEqual([1, 4]);
        });

        // v83.0.0 (ece335c35) - a filter on a mistyped field no longer hides every row.
        it('ignores a filter on a field the store does not have, with a warning', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}),
                store = createStore(['status'], [{id: 1, status: 'open'}]);

            expect(idsPassing(store, {field: 'stauts', op: '=', value: 'open'})).toEqual([1]);
            expect(warn.mock.calls.flat().join(' ')).toContain("Unknown field 'stauts'");
        });

        // v56.4.0 (c379d6236, #3327) - rows under edit no longer vanish from a filtered grid.
        describe('records with uncommitted changes', () => {
            const data = [
                {id: 1, status: 'open'},
                {id: 2, status: 'closed'}
            ];

            it('pass while their committed value passes', () => {
                const store = createStore(['status'], data);
                store.setFilter({field: 'status', op: '=', value: 'open'});

                store.modifyRecords({id: 1, status: 'closed'});
                expect(ids(store.records)).toEqual([1]);
            });

            it('always pass when newly added', () => {
                const store = createStore(['status'], data);
                store.setFilter({field: 'status', op: '=', value: 'open'});

                store.addRecords({id: 3, status: 'closed'});
                expect(ids(store.records)).toEqual([1, 3]);
            });
        });
    });
});

//------------------
// Helpers
//------------------
function createStore(fields: Array<string | FieldSpec>, data: PlainObject[]): Store {
    const store = new Store({fields, data});
    onTestFinished(() => store.destroy());
    return store;
}

/** Ids of the store's records that pass a filter, tested directly against the store's fields. */
function idsPassing(store: Store, spec: FieldFilterSpec): number[] {
    const test = parseFilter(spec).getTestFn(store);
    return ids(store.allRecords.filter(test));
}

function ids(records: StoreRecord[]): number[] {
    return sortBy(records.map(it => it.id as number));
}
