/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Store, type StoreRecord} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {sortBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Hierarchical data in a Store: how records navigate the tree, and how loads and updates maintain
 * it. Tree grids place rows by `treePath` and expand to `maxDepth`, so a broken parent link or
 * path misplaces or drops rows.
 */
beforeAll(() => initTestAppAsync());

describe('StoreRecord', () => {
    describe('tree navigation', () => {
        it('resolves parents, children, descendants and ancestors', () => {
            const store = newTreeStore(),
                [root, a, a1] = [store.getById(1), store.getById(10), store.getById(100)];

            expect(a.parent).toBe(root);
            expect(root.parent).toBeNull();
            expect(ids(a.allChildren)).toEqual([100, 101]);
            expect(a1.allChildren).toEqual([]);
            // Fixed in 66.1.0 - descendants previously included the record itself.
            expect(ids(root.allDescendants)).toEqual([10, 11, 100, 101]);
            expect(a1.allAncestors.map(it => it.id)).toEqual([10, 1]);
            expect([root.depth, a.depth, a1.depth]).toEqual([0, 1, 2]);
        });

        it('builds tree paths from string ids, even for numeric ids', () => {
            // Fixed in 78.0.0 (#4141) - numeric ids left grids unable to place child rows.
            const store = newTreeStore();
            expect(store.getById(100).treePath).toEqual(['1', '10', '100']);
            expect(store.getById(2).treePath).toEqual(['2']);
        });
    });
});

describe('Store', () => {
    describe('maxDepth', () => {
        it('tracks the deepest records as they come and go', () => {
            const store = newTreeStore();
            expect(store.maxDepth).toBe(2);

            store.updateData({remove: [100, 101]});
            expect(store.maxDepth).toBe(1);

            store.updateData({add: [{parentId: 11, rawData: {id: 110, children: [{id: 1100}]}}]});
            expect(store.maxDepth).toBe(3);

            // The same records reloaded flat - shallower, with none removed.
            store.loadData([1, 2, 10, 11, 110, 1100].map(id => ({id})));
            expect(store.maxDepth).toBe(0);
        });
    });

    describe('updateData', () => {
        it('adds ChildRawData under an existing parent, with its own children', () => {
            const store = newTreeStore(),
                changes = store.updateData({
                    add: [{parentId: 11, rawData: {id: 110, name: 'B1', children: [{id: 1100}]}}]
                });

            expect(ids(changes.add)).toEqual([110, 1100]);
            expect(ids(store.getById(11).allChildren)).toEqual([110]);
            expect(store.getById(1100).treePath).toEqual(['1', '11', '110', '1100']);
            expect(store.allRootCount).toBe(2);
        });

        it('adds ChildRawData with a null parentId as a root record', () => {
            // Fixed in 55.0.2 - a null or undefined parentId previously threw.
            const store = newTreeStore();
            store.updateData({add: [{parentId: null, rawData: {id: 3, name: 'C'}}]});

            expect(store.getById(3).parent).toBeNull();
            expect(ids(store.allRootRecords)).toEqual([1, 2, 3]);
        });

        it('keeps the existing children of an updated parent', () => {
            const store = newTreeStore(),
                a1 = store.getById(100);
            store.updateData({update: [{id: 10, name: 'A!', children: []}]});

            const a = store.getById(10);
            expect(a.get('name')).toBe('A!');
            expect(ids(a.allChildren)).toEqual([100, 101]);
            expect(store.getById(100)).toBe(a1);
            expect(a1.parent).toBe(a);
        });
    });

    describe('removeRecords', () => {
        it('removes the descendants of a removed record until reverted', () => {
            const store = newTreeStore();
            store.removeRecords(10);

            expect(ids(store.allRecords)).toEqual([1, 2, 11]);
            expect(ids(store.removedRecords)).toEqual([10, 100, 101]);

            store.revert();
            expect(store.allCount).toBe(6);
            expect(ids(store.getById(10).allChildren)).toEqual([100, 101]);
        });
    });
});

//------------------
// Helpers
//------------------
// Uses numeric ids, as many server-sourced trees do - these once broke tree paths.
function newTreeStore(): Store {
    const store = new Store({
        fields: ['name'],
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
        ]
    });
    onTestFinished(() => store.destroy());
    return store;
}

// Record ids, sorted - record order is not a contract of Store.
function ids(records: StoreRecord[]) {
    return sortBy(records.map(it => it.id));
}
