/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Store, type StoreConfig, type StoreRecord} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {sortBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Local, uncommitted changes to a Store - adds, modifications and removals - and how they are
 * tracked, reverted and committed. Inline grid editing is built on these APIs, and apps bind
 * their Save and Revert buttons to the dirty state they report.
 */
describe('Store', () => {
    beforeAll(() => initTestAppAsync());

    describe('modifyRecords', () => {
        // Records with few populated fields keep defaults on a shared prototype, wider ones are
        // cloned from a template carrying every field. Dirty tracking must hold for both.
        describe.each([
            {form: 'dense', denseRecordThreshold: 1},
            {form: 'sparse', denseRecordThreshold: 999}
        ])('with $form record data', ({denseRecordThreshold}) => {
            const newFormStore = () => newStore({experimental: {denseRecordThreshold}});

            it('parses modified values and tracks them as uncommitted', () => {
                const store = newFormStore(),
                    orig = store.getById(1),
                    changes = store.modifyRecords({id: 1, qty: '5'}),
                    rec = store.getById(1);

                expect(changes.update[0]).toBe(rec);
                expect(rec.get('qty')).toBe(5);
                expect(rec.isModified).toBe(true);
                expect(rec.isCommitted).toBe(false);
                expect(rec.committedData.qty).toBe(1);
                expect(rec.getModifiedValues()).toEqual({id: 1, qty: 5});
                expect(orig.get('qty')).toBe(1);
                expect(store.isDirty).toBe(true);
                expect(ids(store.dirtyRecords)).toEqual([1]);
            });

            it('treats a record edited back to its committed values as unmodified', () => {
                // Fixed in 77.1.1 - the record previously stayed modified.
                const store = newFormStore();
                store.modifyRecords({id: 1, qty: 5});
                store.modifyRecords({id: 1, qty: 1});

                const rec = store.getById(1);
                expect(rec.isModified).toBe(false);
                expect(rec.isCommitted).toBe(true);
                expect(rec.getModifiedValues()).toBeNull();
                expect(store.dirtyRecords).toEqual([]);
            });

            it('reports a field modified back to its default in getModifiedValues', () => {
                // Fixed in 87.0.0 - a change to a field's default value was omitted.
                const store = newFormStore();
                store.modifyRecords({id: 3, qty: null});

                const rec = store.getById(3);
                expect(rec.get('qty')).toBe(0);
                expect(rec.getModifiedValues()).toEqual({id: 3, qty: 0});
            });
        });

        it('returns null for modifications that change no values', () => {
            const store = newStore(),
                rec = store.getById(1);

            expect(store.modifyRecords({id: 1, qty: '1'})).toBeNull();
            expect(store.getById(1)).toBe(rec);
            expect(store.isDirty).toBe(false);
        });

        it('leaves the store clean once its only edit is undone', () => {
            const store = newStore(),
                committed = store.getById(1);
            store.modifyRecords({id: 1, qty: 5});
            store.modifyRecords({id: 1, qty: 1});

            expect(store.isDirty).toBe(false);
            expect(store.getById(1)).toBe(committed);
        });

        it('stays dirty when one of two edited records is undone', () => {
            const store = newStore();
            store.modifyRecords([
                {id: 1, qty: 5},
                {id: 2, qty: 5}
            ]);
            store.modifyRecords({id: 1, qty: 1});

            expect(store.isDirty).toBe(true);
            expect(store.getById(1).isModified).toBe(false);
            expect(store.getById(2).isModified).toBe(true);
        });
    });

    describe('addRecords', () => {
        it('adds parsed records in an uncommitted state', () => {
            const store = newStore();
            store.addRecords({id: 'new', name: 'n', qty: '4'});

            const rec = store.getById('new');
            expect(rec.get('qty')).toBe(4);
            expect(rec.isAdd).toBe(true);
            expect(rec.isCommitted).toBe(false);
            expect(rec.raw).toBeNull();
            expect(ids(store.addedRecords)).toEqual(['new']);
            expect(store.committedRecords).not.toContain(rec);
            expect(store.isDirty).toBe(true);
        });

        // Fixed in 89.0.0 - isDirty returned null, not false, for an added record.
        it('reports an added record as not dirty', () => {
            const store = newStore();
            store.addRecords({id: 'new', name: 'n'});

            expect(store.getById('new').isDirty).toBe(false);
        });

        it('rejects records without a unique id', () => {
            const store = newStore();
            expect(() => store.addRecords({name: 'n'})).toThrow(`Must provide 'id'`);
            expect(() => store.addRecords({id: 1, name: 'n'})).toThrow(`Duplicate id '1'`);
        });
    });

    describe('removeRecords', () => {
        it('removes records locally, leaving them in the committed set', () => {
            const store = newStore(),
                rec = store.getById(2);
            store.removeRecords(rec);

            expect(ids(store.allRecords)).toEqual([1, 3]);
            expect(store.removedRecords[0]).toBe(rec);
            expect(store.committedRecords).toContain(rec);
            expect(store.isDirty).toBe(true);
        });
    });

    describe('revertRecords', () => {
        it('restores the committed records for the given ids only', () => {
            const store = newStore(),
                rec1 = store.getById(1);
            store.modifyRecords([
                {id: 1, qty: 10},
                {id: 3, qty: 30}
            ]);

            store.revertRecords(1);
            expect(store.getById(1)).toBe(rec1);
            expect(store.getById(3).isModified).toBe(true);
            expect(store.isDirty).toBe(true);

            store.revertRecords(store.getById(3));
            expect(store.isDirty).toBe(false);
        });
    });

    describe('revert', () => {
        it('discards all local adds, modifications and removals', () => {
            const store = newStore(),
                rec1 = store.getById(1);
            store.addRecords({id: 'new', name: 'n'});
            store.modifyRecords({id: 1, qty: 10});
            store.removeRecords(2);

            store.revert();
            expect(ids(store.allRecords)).toEqual([1, 2, 3]);
            expect(store.getById(1)).toBe(rec1);
            expect(store.isDirty).toBe(false);
            expect(store.addedRecords).toEqual([]);
            expect(store.removedRecords).toEqual([]);
            expect(store.dirtyRecords).toEqual([]);
        });
    });

    describe('loadData', () => {
        it('discards local changes, reusing unchanged committed records', () => {
            const store = newStore(),
                rec1 = store.getById(1);
            store.addRecords({id: 'new', name: 'n'});
            store.modifyRecords({id: 1, qty: 10});
            store.removeRecords(2);

            store.loadData(threeRows());
            expect(store.getById(1)).toBe(rec1);
            expect(ids(store.allRecords)).toEqual([1, 2, 3]);
            expect(store.isDirty).toBe(false);
        });
    });

    describe('updateData', () => {
        it('leaves the store clean once local changes are committed back to it', () => {
            // The commit pattern of Toolbox's inline editing example: drop local adds, then
            // apply the server's response - adds with server-assigned ids, updates, and removals.
            const store = newStore();
            store.addRecords({id: 'tmp', name: 'n', qty: 4});
            store.modifyRecords({id: 1, qty: 10});
            store.removeRecords(2);

            const {addedRecords, dirtyRecords, removedRecords} = store;
            store.removeRecords(addedRecords);
            store.updateData({
                add: addedRecords.map(it => ({...it.getValues(), id: 4})),
                update: dirtyRecords.map(it => it.getValues()),
                remove: removedRecords.map(it => it.id)
            });

            expect(store.isDirty).toBe(false);
            expect(ids(store.allRecords)).toEqual([1, 3, 4]);
            expect(store.getById(1).get('qty')).toBe(10);
            expect(store.getById(4).isCommitted).toBe(true);
            expect(store.addedRecords).toEqual([]);
            expect(store.removedRecords).toEqual([]);
            expect(store.dirtyRecords).toEqual([]);
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
            {name: 'qty', type: 'number', defaultValue: 0}
        ],
        data: threeRows(),
        ...config
    });
    onTestFinished(() => store.destroy());
    return store;
}

function threeRows() {
    return [
        {id: 1, name: 'a', qty: 1},
        {id: 2, name: 'b', qty: 2},
        {id: 3, name: 'c', qty: 5}
    ];
}

// Record ids, sorted - record order is not a contract of Store.
function ids(records: StoreRecord[]) {
    return sortBy(records.map(it => it.id));
}
