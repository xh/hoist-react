/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Store, type StoreConfig, type StoreRecord} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {range, sortBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The deltas between a Store's successive filtered RecordSets, as reported by `diffFrom()`. Grid
 * applies these to ag-Grid verbatim as row transactions, so a wrong delta leaves stale, missing
 * or duplicate rows on screen. Each case runs with patching off (the default - every change
 * builds a fresh record map) and on (changes layered as patches over a shared base), as the two
 * derive records, filter results and deltas by separate code paths.
 */
describe('RecordSet', () => {
    beforeAll(() => initTestAppAsync());

    describe.each([
        {mode: 'without patching', maxPatchRatio: 0},
        {mode: 'with patching', maxPatchRatio: 0.5}
    ])('diffFrom, $mode', ({maxPatchRatio}) => {
        const newStore = (config: Partial<StoreConfig> = {}) =>
            newTestStore({experimental: {maxPatchRatio}, ...config});

        it('reports the records added, updated and removed by updateData', () => {
            const store = newStore(),
                prev = store._filtered;

            const delta = deltaOf(store, () =>
                store.updateData({
                    update: [row(5, 50)],
                    add: [row(11, 11), row(12, 0)],
                    remove: [6]
                })
            );
            expect(delta).toEqual({add: [11], update: [5], remove: [6]});
            expect(ids(store.records)).toEqual([3, 4, 5, 7, 8, 9, 10, 11]);

            // With patching on, the new set shares the old one's base - proof each run takes
            // its own path.
            expect(store._filtered.hasDeltaFrom(prev)).toBe(maxPatchRatio > 0);
        });

        it('reports records entering and leaving the filter as adds and removes', () => {
            const store = newStore(),
                delta = deltaOf(store, () => store.updateData([row(1, 10), row(3, 0)]));

            expect(delta).toEqual({add: [1], update: [], remove: [3]});
            expect(ids(store.records)).toEqual([1, 4, 5, 6, 7, 8, 9, 10]);
        });

        it('reports the changes made by a partial reload', () => {
            // Row 5 changed, row 6 dropped, row 11 new.
            const store = newStore(),
                rows = range(1, 12)
                    .filter(id => id !== 6)
                    .map(id => row(id, id === 5 ? 50 : id));

            const delta = deltaOf(store, () => store.loadData(rows));
            expect(delta).toEqual({add: [11], update: [5], remove: [6]});
        });

        it('reports local changes and their reverts', () => {
            const store = newStore(),
                modify = () => store.modifyRecords({id: 5, qty: 55});

            expect(deltaOf(store, modify)).toEqual({add: [], update: [5], remove: []});
            expect(deltaOf(store, () => store.revertRecords(5))).toEqual({
                add: [],
                update: [5],
                remove: []
            });
            expect(store.isDirty).toBe(false);

            modify();
            store.removeRecords(6);
            store.addRecords(row(11, 11));
            expect(deltaOf(store, () => store.revert())).toEqual({
                add: [6],
                update: [5],
                remove: [11]
            });
            expect(ids(store.records)).toEqual(range(3, 11));
        });

        it('reports the net change across several steps', () => {
            // Grid debounces its syncs, so one sync can span several changes.
            const store = newStore();

            const delta = deltaOf(store, () => {
                store.updateData({add: [row(11, 11)]});
                store.updateData({remove: [11]});
                store.updateData({remove: [5]});
                store.updateData({add: [row(5, 5)]});
            });
            expect(delta).toEqual({add: [], update: [5], remove: []});
        });

        it('reports the descendants of a removed tree record as removed', () => {
            const store = newStore({
                filter: null,
                data: [
                    {id: 1, children: [{id: 10, children: [{id: 100}, {id: 101}]}, {id: 11}]},
                    {id: 2}
                ]
            });

            const delta = deltaOf(store, () => store.updateData({remove: [10]}));
            expect(delta).toEqual({add: [], update: [], remove: [10, 100, 101]});
        });

        it('carries changedFields only across a single value-only update', () => {
            // Grid skips re-sorting when changedFields proves sorted fields are unchanged.
            const store = newStore({filter: null}),
                changedFields = new Set(['qty']),
                first = store._filtered;

            const changes = store.updateData({update: [row(5, 50)], changedFields});
            expect(changes.changedFields).toEqual(changedFields);
            expect(store._filtered.diffFrom(first).changedFields).toEqual(changedFields);

            const second = store._filtered;
            store.updateData({update: [row(5, 55)], changedFields});
            expect(store._filtered.diffFrom(second).changedFields).toEqual(changedFields);
            expect(store._filtered.diffFrom(first).changedFields).toBeNull();

            const third = store._filtered;
            store.updateData({update: [row(5, 60)], add: [row(11, 11)], changedFields});
            expect(store._filtered.diffFrom(third).changedFields).toBeNull();
        });
    });
});

//------------------
// Helpers
//------------------
// Ten rows, with a filter passing rows 3-10.
function newTestStore(config: Partial<StoreConfig>): Store {
    const store = new Store({
        fields: ['name', {name: 'qty', type: 'int'}],
        filter: {field: 'qty', op: '>', value: 2},
        data: range(1, 11).map(id => row(id, id)),
        ...config
    });
    onTestFinished(() => store.destroy());
    return store;
}

function row(id: number, qty: number) {
    return {id, name: `Row ${id}`, qty};
}

// Ids of the records Grid would add, update and remove to apply the changes made by `fn`.
function deltaOf(store: Store, fn: () => void) {
    const prev = store._filtered;
    fn();
    const {add, update, remove} = store._filtered.diffFrom(prev);
    return {add: ids(add), update: ids(update), remove: ids(remove)};
}

// Record ids, sorted - record order is not a contract of Store.
function ids(records: StoreRecord[]) {
    return sortBy(records.map(it => it.id));
}
