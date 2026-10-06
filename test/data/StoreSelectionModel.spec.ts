/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Store, type StoreSelectionConfig, StoreSelectionModel} from '@xh/hoist/data';
import {reaction} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test';
import {sortBy} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Record selection within a Store. Every GridModel owns one, and apps drive detail panels and
 * record actions from it. The selection must follow the store as it reloads and filters, and its
 * id getters must ignore data-only changes - Grid's selection sync relies on that.
 */

beforeAll(() => initTestAppAsync());

const rows = [
    {id: 1, name: 'Apple', region: 'US'},
    {id: 2, name: 'Pear', region: 'EU'},
    {id: 3, name: 'Plum', region: 'US'}
];

function createSelModel(mode: StoreSelectionConfig['mode']) {
    const store = new Store({fields: ['name', 'region'], data: rows}),
        selModel = new StoreSelectionModel({store, mode});
    onTestFinished(() => {
        selModel.destroy();
        store.destroy();
    });
    return {store, selModel};
}

describe('StoreSelectionModel', () => {
    describe('select', () => {
        it('accepts records or ids, replacing the prior selection', () => {
            const {store, selModel} = createSelModel('multiple');

            selModel.select(store.getById(1));
            expect(selModel.selectedRecord).toBe(store.getById(1));
            expect(selModel.selectedId).toBe(1);

            selModel.select([2, 3]);
            expect(selModel.selectedIds).toEqual([2, 3]);
            expect(selModel.count).toBe(2);
            expect(selModel.selectedRecord).toBeNull();
            expect(selModel.selectedId).toBeNull();

            selModel.clear();
            expect(selModel.isEmpty).toBe(true);
        });

        it('adds to the selection when clearSelection is false', () => {
            const {selModel} = createSelModel('multiple');
            selModel.select(1);
            selModel.select(3, false);
            expect(selModel.selectedIds).toEqual([1, 3]);
        });

        it('selects only the first of several records in single mode', () => {
            const {store, selModel} = createSelModel('single');
            selModel.select([2, 3]);
            expect(selModel.selectedRecord).toBe(store.getById(2));
        });

        // Fixed in 89.0.0 - adding to a single-mode selection kept the prior record as well.
        it('keeps one record in single mode when adding to the selection', () => {
            const {selModel} = createSelModel('single');
            selModel.select(1);
            selModel.select(2, false);
            expect(selModel.selectedIds).toEqual([2]);
        });

        it('ignores ids not in the store or hidden by its filter', () => {
            const {store, selModel} = createSelModel('multiple');
            store.setFilter({field: 'region', op: '=', value: 'US'});
            selModel.select([1, 2, 99]);
            expect(selModel.selectedIds).toEqual([1]);
        });

        it('does nothing in disabled mode', () => {
            const {selModel} = createSelModel('disabled');
            selModel.select(1);
            selModel.selectAll();
            expect(selModel.isEmpty).toBe(true);
        });
    });

    describe('selectAll', () => {
        it('selects the records that pass the filter, in multiple mode only', () => {
            const multi = createSelModel('multiple'),
                single = createSelModel('single');
            multi.store.setFilter({field: 'region', op: '=', value: 'US'});

            multi.selModel.selectAll();
            single.selModel.selectAll();
            // Store order is not a contract - compare as a set.
            expect(sortBy(multi.selModel.selectedIds)).toEqual([1, 3]);
            expect(single.selModel.isEmpty).toBe(true);
        });
    });

    describe('store changes', () => {
        it('follows the selected record to its new instance when its data changes', () => {
            const {store, selModel} = createSelModel('single'),
                onIdsChange = vi.fn(),
                onRecordChange = vi.fn();
            selModel.select(1);
            // Grid syncs its selection from selectedIds, so a data-only change must not notify it.
            const disposers = [
                reaction(() => selModel.selectedIds, onIdsChange),
                reaction(() => selModel.selectedRecord, onRecordChange)
            ];
            onTestFinished(() => disposers.forEach(it => it()));

            // An unchanged reload keeps the same record - nothing to report.
            store.loadData(rows);
            expect(onRecordChange).not.toHaveBeenCalled();

            store.loadData([{...rows[0], name: 'Green Apple'}, rows[1], rows[2]]);
            expect(selModel.selectedRecord).toBe(store.getById(1));
            expect(selModel.selectedRecord.get('name')).toBe('Green Apple');
            expect(onRecordChange).toHaveBeenCalledOnce();
            expect(onIdsChange).not.toHaveBeenCalled();
        });

        it('drops records removed from the store', () => {
            const {store, selModel} = createSelModel('multiple');
            selModel.select([1, 2]);

            store.loadData([rows[0], rows[2]]);
            expect(selModel.selectedIds).toEqual([1]);

            store.removeRecords(1);
            expect(selModel.isEmpty).toBe(true);
            expect(selModel.selectedRecord).toBeNull();
        });

        it('drops records hidden by a filter, and does not restore them when it clears', () => {
            const {store, selModel} = createSelModel('single');
            selModel.select(2);

            store.setFilter({field: 'region', op: '=', value: 'US'});
            expect(selModel.isEmpty).toBe(true);

            store.clearFilter();
            expect(selModel.isEmpty).toBe(true);
        });
    });
});
