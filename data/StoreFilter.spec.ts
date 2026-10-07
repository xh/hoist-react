/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Store, type StoreConfig, type StoreRecord} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test';
import {sortBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Local filtering of a Store's records, for flat and tree data. Every filtered grid and filter
 * field relies on it. Store refilters incrementally where it can, so `refreshFilter()` must
 * force a full pass for filters that depend on external state.
 */
describe('Store', () => {
    beforeAll(() => initTestAppAsync());

    describe('setFilter', () => {
        it('excludes filtered records from records, but not from allRecords', () => {
            const store = newStore();
            store.setFilter({field: 'qty', op: '>', value: 2});

            expect(ids(store.records)).toEqual([2, 3]);
            expect(store.count).toBe(2);
            expect(store.allCount).toBe(3);
            expect(store.recordIsFiltered(1)).toBe(true);
            expect(store.recordIsFiltered(2)).toBe(false);

            store.clearFilter();
            expect(ids(store.records)).toEqual([1, 2, 3]);
        });

        it('ignores a filter equal to the current one', () => {
            const store = newStore();
            store.setFilter({field: 'qty', op: '>', value: 2});
            const {filter, records} = store;

            store.setFilter({field: 'qty', op: '>', value: 2});
            expect(store.filter).toBe(filter);
            expect(store.records).toBe(records);
        });
    });

    describe('refreshFilter', () => {
        it('reruns a function filter whose external state has changed', () => {
            // Fixed in 92dba8612 - incremental refiltering skipped this when no record changed.
            const store = newStore(),
                allowed = new Set([1]);
            store.setFilter({key: 'allowed', testFn: rec => allowed.has(rec.id)});
            expect(ids(store.records)).toEqual([1]);

            allowed.add(2);
            store.refreshFilter();
            expect(ids(store.records)).toEqual([1, 2]);
        });
    });

    describe('tree data', () => {
        it('keeps the ancestors of records that pass a filter', () => {
            const store = newTreeStore();
            store.setFilter({field: 'name', op: '=', value: 'A1'});

            expect(ids(store.records)).toEqual([1, 10, 100]);
            expect(ids(store.rootRecords)).toEqual([1]);
            expect(ids(store.getById(10).children)).toEqual([100]);
            expect(ids(store.getById(10).allChildren)).toEqual([100, 101]);
            expect(ids(store.getById(1).descendants)).toEqual([10, 100]);
        });

        it('keeps the children of records that pass a filter with filterIncludesChildren', () => {
            const store = newTreeStore({filterIncludesChildren: true});
            store.setFilter({field: 'name', op: '=', value: 'A'});

            expect(ids(store.records)).toEqual([1, 10, 100, 101]);
        });
    });
});

//------------------
// Helpers
//------------------
function newStore(config: Partial<StoreConfig> = {}): Store {
    const store = new Store({
        fields: ['name', {name: 'qty', type: 'int'}],
        data: [
            {id: 1, name: 'a', qty: 1},
            {id: 2, name: 'b', qty: 5},
            {id: 3, name: 'c', qty: 10}
        ],
        ...config
    });
    onTestFinished(() => store.destroy());
    return store;
}

function newTreeStore(config: Partial<StoreConfig> = {}): Store {
    return newStore({
        data: [
            {
                id: 1,
                name: 'Root',
                children: [
                    {
                        id: 10,
                        name: 'A',
                        children: [
                            {id: 100, name: 'A1'},
                            {id: 101, name: 'A2'}
                        ]
                    },
                    {id: 11, name: 'B'}
                ]
            },
            {id: 2, name: 'Other'}
        ],
        ...config
    });
}

// Record ids, sorted - record order is not a contract of Store.
function ids(records: StoreRecord[]) {
    return sortBy(records.map(it => it.id));
}
