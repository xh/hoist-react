/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type PlainObject} from '@xh/hoist/core';
import {Store, type StoreConfig, type StoreRecord} from '@xh/hoist/data';
import {reaction} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {cloneDeep, sortBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Loading server data into a Store: record reuse across reloads, transactional updates, summary
 * records, and load timestamps. Grids preserve row state only for reused record instances, and
 * skip all work for reloads that change nothing - so a reuse bug shows stale data or drops grid
 * selection and expansion.
 */
describe('Store', () => {
    beforeAll(() => initTestAppAsync());

    describe('constructor', () => {
        it('rejects an id field and duplicate field names', () => {
            expect(() => new Store({fields: ['name', 'id']})).toThrow('id property is created');
            // Duplicate names were rejected from 87.2.0 - previously a cryptic error in Cube.
            expect(() => new Store({fields: ['name', 'qty', 'name']})).toThrow(
                'Field names must be unique'
            );
        });

        it('freezes record data unless freezeData is false', () => {
            const frozen = newStore({data: [{id: 1, name: 'a'}]}),
                unfrozen = newStore({data: [{id: 1, name: 'a'}], freezeData: false});

            expect(Object.isFrozen(frozen.getById(1).data)).toBe(true);
            expect(Object.isFrozen(unfrozen.getById(1).data)).toBe(false);
        });
    });

    describe('loadData', () => {
        // Records with few populated fields keep defaults on a shared prototype, wider ones are
        // cloned from a template carrying every field. Reuse must hold for both.
        describe.each([
            {form: 'dense', denseRecordThreshold: 1},
            {form: 'sparse', denseRecordThreshold: 999}
        ])('with $form record data', ({denseRecordThreshold}) => {
            const newFormStore = () => newStore({experimental: {denseRecordThreshold}});

            it('reuses record instances for unchanged rows', () => {
                const store = newFormStore(),
                    rows = [
                        {id: 1, name: 'a', qty: 1, list: ['x']},
                        {id: 2, name: 'b', qty: 2}
                    ];
                store.loadData(rows);
                const [rec1, rec2] = [store.getById(1), store.getById(2)];

                store.loadData(cloneDeep(rows));
                expect(store.getById(1)).toBe(rec1);
                expect(store.getById(2)).toBe(rec2);
            });

            it('replaces records whose data changed and drops records not reloaded', () => {
                const store = newFormStore();
                store.loadData([
                    {id: 1, name: 'a', qty: 1},
                    {id: 2, name: 'b', qty: 2},
                    {id: 3, name: 'c', qty: 3}
                ]);
                const [rec1, rec2] = [store.getById(1), store.getById(2)];

                store.loadData([
                    {id: 1, name: 'a', qty: 1},
                    {id: 2, name: 'b', qty: 20}
                ]);
                const newRec2 = store.getById(2);
                expect(store.getById(1)).toBe(rec1);
                expect(newRec2).not.toBe(rec2);
                expect(newRec2.get('qty')).toBe(20);
                expect(newRec2.isCommitted).toBe(true);
                expect(ids(store.allRecords)).toEqual([1, 2]);
            });

            it('does not reuse a record when a reload omits a field it had set', () => {
                const store = newFormStore();
                store.loadData([{id: 1, name: 'a', qty: 1}]);
                const rec = store.getById(1);

                store.loadData([{id: 1, name: 'a'}]);
                expect(store.getById(1)).not.toBe(rec);
                expect(store.getById(1).get('qty')).toBeNull();
            });

            it('does not reuse a record when a new value deep-equals an object default', () => {
                const store = newFormStore();
                store.loadData([{id: 1, note: 'x'}]);
                const rec = store.getById(1);

                // Same count of non-default values, and `[]` deep-equals the `list` default.
                store.loadData([{id: 1, list: []}]);
                expect(store.getById(1)).not.toBe(rec);
                expect(store.getById(1).get('note')).toBeNull();
            });
        });

        it('preserves its record collections when a reload changes nothing', () => {
            const store = newStore(),
                rows = [
                    {id: 1, name: 'a'},
                    {id: 2, name: 'b'}
                ];
            store.loadData(rows);
            const records = store.records,
                onRecordsChange = vi.fn();
            onTestFinished(reaction(() => store.records, onRecordsChange));

            // Record order is not a contract - a reorder alone is also a no-op.
            store.loadData(cloneDeep(rows).reverse());
            expect(store.records).toBe(records);
            expect(onRecordsChange).not.toHaveBeenCalled();
        });

        it('reuses an unchanged child only while it keeps its tree position', () => {
            const store = newStore();
            store.loadData([
                {id: 'a', name: 'A', children: [{id: 'c', name: 'C'}]},
                {id: 'b', name: 'B'}
            ]);
            const child = store.getById('c');

            // Parent data changes - child is reused and resolves the new parent instance.
            store.loadData([
                {id: 'a', name: 'A2', children: [{id: 'c', name: 'C'}]},
                {id: 'b', name: 'B'}
            ]);
            expect(store.getById('c')).toBe(child);
            expect(child.parent).toBe(store.getById('a'));
            expect(child.parent.get('name')).toBe('A2');

            // Child moves to another parent with identical data - a new record is required.
            store.loadData([
                {id: 'a', name: 'A2'},
                {id: 'b', name: 'B', children: [{id: 'c', name: 'C'}]}
            ]);
            const moved = store.getById('c');
            expect(moved).not.toBe(child);
            expect(moved.parent.id).toBe('b');
            expect(store.getById('a').allChildren).toEqual([]);
        });

        it('reuses records by digest alone when a digestSpec is set', () => {
            const store = newStore({digestSpec: 'rev'});
            store.loadData([{id: 1, rev: 1, qty: 1}]);
            const rec = store.getById(1);

            // An equal digest is trusted - the row is not even parsed.
            store.loadData([{id: 1, rev: 1, qty: 2}]);
            expect(store.getById(1)).toBe(rec);
            expect(rec.get('qty')).toBe(1);

            // A changed digest builds a new record, even for identical values.
            store.loadData([{id: 1, rev: 2, qty: 1}]);
            expect(store.getById(1)).not.toBe(rec);
        });

        it('runs processRawData on each row, retaining the source object as raw', () => {
            const store = newStore({processRawData: raw => ({...raw, qty: raw.lots * 100})}),
                raw = {id: 1, name: 'a', lots: 2};
            store.loadData([raw]);

            const rec = store.getById(1);
            expect(rec.get('qty')).toBe(200);
            expect(rec.raw).toBe(raw);
        });

        it('resolves record ids via an idSpec function, for loads and updates', () => {
            const store = newStore({idSpec: raw => `${raw.book}|${raw.symbol}`});
            store.loadData([{book: 'A', symbol: 'XYZ', qty: 1}]);

            const rec = store.getById('A|XYZ');
            expect(rec.id).toBe('A|XYZ');
            expect(rec.data.id).toBe('A|XYZ');

            const changes = store.updateData([{book: 'A', symbol: 'XYZ', qty: 2}]);
            expect(changes.update).toHaveLength(1);
            expect(changes.add).toBeUndefined();
            expect(store.getById('A|XYZ').get('qty')).toBe(2);
        });

        it('rejects rows with a missing or duplicate id', () => {
            const store = newStore();
            expect(() => store.loadData([{name: 'a'}])).toThrow('Record needs an ID');
            expect(() => store.loadData([{id: 1}, {id: 1}])).toThrow('ID 1 is not unique');
            expect(() => store.loadData([{id: 1, children: [{id: 1}]}])).toThrow(
                'ID 1 is not unique'
            );
        });
    });

    describe('updateData', () => {
        it('applies array rows as committed updates and adds', () => {
            const store = newStore({data: threeRows()}),
                changes = store.updateData([
                    {id: 1, name: 'a', qty: 10},
                    {id: 4, name: 'd', qty: 4}
                ]);

            expect(ids(changes.update)).toEqual([1]);
            expect(ids(changes.add)).toEqual([4]);
            expect(store.getById(1).get('qty')).toBe(10);
            expect(store.getById(1).isCommitted).toBe(true);
            expect(store.getById(4).isCommitted).toBe(true);
            expect(store.isDirty).toBe(false);
        });

        it('replaces record data in full rather than merging into it', () => {
            const store = newStore({data: threeRows()});
            store.updateData([{id: 1, qty: 10}]);

            expect(store.getById(1).get('qty')).toBe(10);
            expect(store.getById(1).get('name')).toBeNull();
        });

        it('applies a transaction of updates, adds and removes', () => {
            const store = newStore({data: threeRows()}),
                changes = store.updateData({
                    update: [{id: 1, name: 'a', qty: 10}],
                    add: [{id: 4, name: 'd'}],
                    remove: [2]
                });

            expect(ids(store.allRecords)).toEqual([1, 3, 4]);
            expect(ids(changes.update)).toEqual([1]);
            expect(ids(changes.add)).toEqual([4]);
            // Removed records are reported as records from v87 - no longer resolvable by id.
            expect(ids(changes.remove)).toEqual([2]);
            expect(changes.remove[0].get('name')).toBe('b');
        });

        it('returns null and keeps records for updates that change nothing', () => {
            const store = newStore({data: threeRows()}),
                rec = store.getById(1);

            expect(store.updateData([{id: 1, name: 'a', qty: '1'}])).toBeNull();
            expect(store.updateData({update: []})).toBeNull();
            expect(store.getById(1)).toBe(rec);
        });

        it('rejects updates to unknown ids and unknown transaction keys', () => {
            const store = newStore({data: threeRows()});
            expect(() => store.updateData({update: [{id: 99}]})).toThrow('must have stable ids');
            expect(() => store.updateData({updates: [{id: 1}]} as PlainObject)).toThrow(
                'Unknown argument(s)'
            );
        });

        it('preserves local modifications to records it does not update', () => {
            const store = newStore({data: threeRows()});
            store.modifyRecords([
                {id: 1, qty: 100},
                {id: 2, qty: 200}
            ]);
            store.addRecords({id: 'new', name: 'n'});

            store.updateData({update: [{id: 1, name: 'a', qty: 10}]});

            const [rec1, rec2] = [store.getById(1), store.getById(2)];
            expect(rec1.get('qty')).toBe(10);
            expect(rec1.isCommitted).toBe(true);
            expect(rec2.get('qty')).toBe(200);
            expect(rec2.isModified).toBe(true);
            expect(ids(store.addedRecords)).toEqual(['new']);
            expect(store.isDirty).toBe(true);
        });
    });

    describe('summary records', () => {
        it('holds summary data apart from the regular records', () => {
            const store = newStore();
            store.loadData([{id: 1, name: 'a'}], {id: 'sum', total: 10});

            const {summaryRecord} = store;
            expect(summaryRecord.isSummary).toBe(true);
            expect(summaryRecord.get('total')).toBe(10);
            expect(store.getById('sum')).toBe(summaryRecord);
            expect(ids(store.allRecords)).toEqual([1]);
            expect(store.count).toBe(1);
        });

        it('extracts the root row as summary data with loadRootAsSummary', () => {
            const store = newStore({loadRootAsSummary: true});
            store.loadData([
                {
                    id: 'root',
                    total: 10,
                    children: [{id: 1, children: [{id: 2}]}, {id: 3}]
                }
            ]);

            expect(store.summaryRecord.id).toBe('root');
            expect(ids(store.rootRecords)).toEqual([1, 3]);
            expect(store.getById(1).parent).toBeNull();
            expect(store.getById(2).parent.id).toBe(1);
            expect(() => store.loadData([{id: 'r1'}, {id: 'r2'}])).toThrow(
                'Summary data should be in a single root node'
            );
        });

        it('replaces the summary via updateData without dirtying the store', () => {
            const store = newStore();
            store.loadData(threeRows(), {id: 'sum', total: 10});

            const changes = store.updateData({rawSummaryData: {id: 'sum', total: 20}});
            expect(changes.summaryRecords[0]).toBe(store.summaryRecord);
            expect(store.summaryRecord.get('total')).toBe(20);
            expect(store.isDirty).toBe(false);
        });

        it('reverts local modifications to a summary record', () => {
            // Summary records were not handled by modify/revert before 75.0.1, and revert()
            // threw on stores with a summary before 80.0.0.
            const store = newStore();
            store.loadData(threeRows(), {id: 'sum', total: 10});

            store.modifyRecords({id: 'sum', total: 20});
            expect(store.summaryRecord.get('total')).toBe(20);
            expect(store.isDirty).toBe(true);

            store.revertRecords('sum');
            expect(store.summaryRecord.get('total')).toBe(10);
            expect(store.isDirty).toBe(false);

            store.modifyRecords({id: 'sum', total: 30});
            store.revert();
            expect(store.summaryRecord.get('total')).toBe(10);
            expect(store.isDirty).toBe(false);
        });

        // Fixed in 89.0.0 - reverting a summary record dropped its default field values.
        it('keeps default field values when reverting', () => {
            const store = newStore();
            store.loadData(threeRows(), {id: 'sum', total: 10});
            expect(store.summaryRecord.get('count')).toBe(0);

            store.modifyRecords({id: 1, qty: 100});
            store.revert();
            expect(store.summaryRecord.get('count')).toBe(0);
        });

        // Fixed in 89.0.0 - updating or modifying one summary record dropped all others.
        it('keeps other summary records when one is updated or modified', () => {
            const store = newStore();
            store.loadData(threeRows(), [
                {id: 'top', total: 1},
                {id: 'bottom', total: 2}
            ]);

            store.updateData({update: [{id: 'top', total: 10}]});
            expect(ids(store.summaryRecords)).toEqual(['bottom', 'top']);

            store.modifyRecords({id: 'bottom', total: 20});
            expect(ids(store.summaryRecords)).toEqual(['bottom', 'top']);
        });
    });

    describe('lastLoaded and lastUpdated', () => {
        it('stamps both on load, and only lastUpdated on an update that changes data', () => {
            // Grid detects that its latest change was a load by finding the two equal.
            vi.useFakeTimers({now: 1000});
            const store = newStore();
            store.loadData(threeRows());
            expect(store.lastLoaded).toBe(1000);
            expect(store.lastUpdated).toBe(1000);

            vi.setSystemTime(2000);
            store.updateData([{id: 1, name: 'a', qty: 1}]);
            expect(store.lastUpdated).toBe(1000);

            store.updateData([{id: 1, name: 'a', qty: 10}]);
            expect(store.lastUpdated).toBe(2000);
            expect(store.lastLoaded).toBe(1000);

            vi.setSystemTime(3000);
            store.loadData(threeRows());
            expect(store.lastLoaded).toBe(3000);
            expect(store.lastUpdated).toBe(3000);
        });
    });
});

//------------------
// Helpers
//------------------
function newStore(config: Partial<StoreConfig> = {}): Store {
    const store = new Store({
        fields: [
            {name: 'name', type: 'string'},
            {name: 'qty', type: 'int'},
            {name: 'list', defaultValue: []},
            'note',
            {name: 'total', type: 'int'},
            {name: 'count', type: 'int', defaultValue: 0}
        ],
        ...config
    });
    onTestFinished(() => store.destroy());
    return store;
}

function threeRows(): PlainObject[] {
    return [
        {id: 1, name: 'a', qty: 1},
        {id: 2, name: 'b', qty: 2},
        {id: 3, name: 'c', qty: 3}
    ];
}

// Record ids, sorted - record order is not a contract of Store.
function ids(records: StoreRecord[]) {
    return sortBy(records?.map(it => it.id));
}
