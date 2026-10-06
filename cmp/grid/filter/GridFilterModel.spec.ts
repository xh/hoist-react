/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type GridConfig, type GridFilterModel, GridModel} from '@xh/hoist/cmp/grid';
import {FieldFilter, Store, type StoreRecord} from '@xh/hoist/data';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * GridFilterModel, behind the column header filters of desktop grids. It decides which columns get
 * a filter, and edits the filter on the grid's Store one field at a time, so that a change to one
 * column's filter never disturbs filters on other columns.
 *
 * Filter changes reach the Store on a later tick - tests await `wait()` after each change.
 */
describe('GridFilterModel', () => {
    beforeAll(() => initTestAppAsync());

    describe('fieldSpecs', () => {
        it('includes every Store field when no specs are configured', () => {
            const {filterModel} = createGridModel({filterModel: true});

            expect(specFields(filterModel)).toEqual(['name', 'region', 'status', 'qty']);
        });

        it('adds default specs for filterable columns the configured specs omit', () => {
            // Fixed in 89.0.0 (#4756) - configuring any spec disabled all other column filters.
            const {filterModel} = createGridModel({
                columns: [
                    {field: 'name', filterable: true},
                    {field: 'region'},
                    {field: 'status', filterable: true},
                    {field: 'qty', filterable: true},
                    {field: 'notInStore', filterable: true}
                ],
                filterModel: {fieldSpecs: [{field: 'status', values: ['Open', 'Closed']}]}
            });

            expect(specFields(filterModel)).toEqual(['status', 'name', 'qty']);
            expect(filterModel.getFieldSpec('status').values).toEqual(['Open', 'Closed']);
        });

        it('adds default specs for filterable columns added later', () => {
            const gridModel = createGridModel({
                columns: [{field: 'name', filterable: true}],
                filterModel: {fieldSpecs: ['name']}
            });

            gridModel.setColumns([
                {field: 'name', filterable: true},
                {field: 'region', filterable: true}
            ]);
            expect(specFields(gridModel.filterModel)).toEqual(['name', 'region']);
        });
    });

    describe('setColumnFilters', () => {
        it('replaces the filters on one field, keeping those on other fields', async () => {
            const {filterModel, store} = createGridModel({filterModel: true});

            filterModel.setColumnFilters('region', {field: 'region', op: '=', value: 'US'});
            await wait();
            filterModel.setColumnFilters('qty', {field: 'qty', op: '>', value: 5});
            await wait();
            filterModel.setColumnFilters('region', {field: 'region', op: '=', value: 'EU'});
            await wait();

            expect(columnFilters(filterModel, 'region')).toEqual([
                {field: 'region', op: '=', value: 'EU'}
            ]);
            expect(columnFilters(filterModel, 'qty')).toEqual([{field: 'qty', op: '>', value: 5}]);
            expect(ids(store.records)).toEqual([4]);

            filterModel.setColumnFilters('region', null);
            await wait();
            expect(store.filter.toJSON()).toEqual({field: 'qty', op: '>', value: 5});
            expect(ids(store.records)).toEqual([1, 4]);
        });
    });

    describe('mergeColumnFilters', () => {
        it('adds excluded values to an existing exclude filter on the field', async () => {
            // The grid context menu's "exclude value" action.
            const {filterModel, store} = createGridModel({filterModel: true});

            filterModel.mergeColumnFilters('region', {field: 'region', op: '!=', value: ['US']});
            await wait();
            filterModel.mergeColumnFilters('region', {field: 'region', op: '!=', value: ['EU']});
            await wait();

            const filters = filterModel.getColumnFilters('region');
            expect(filters).toHaveLength(1);
            expect(filters[0].op).toBe('!=');
            expect([...filters[0].value].sort()).toEqual(['EU', 'US']);
            expect(ids(store.records)).toEqual([3]);
        });

        // BUG: cmp/grid/filter/GridFilterModel.ts:116 - merges by assigning to the `value` of the
        // filter passed in, which throws for a FieldFilter instance, as FieldFilters are frozen.
        // A plain spec passed in is mutated as a side effect.
        it.fails('accepts a FieldFilter instance', async () => {
            const {filterModel} = createGridModel({filterModel: true});

            filterModel.mergeColumnFilters('region', {field: 'region', op: '!=', value: ['US']});
            await wait();
            filterModel.mergeColumnFilters(
                'region',
                new FieldFilter({field: 'region', op: '!=', value: ['EU']})
            );
            await wait();

            expect(filterModel.getColumnFilters('region')).toHaveLength(1);
        });
    });

    describe('clear', () => {
        it('removes all column filters, keeping function filters set by the app', async () => {
            const {filterModel, store} = createGridModel({filterModel: true});
            store.setFilter([
                {field: 'region', op: '=', value: 'US'},
                {field: 'qty', op: '>', value: 5},
                {key: 'notClosed', testFn: rec => rec.data.status !== 'Closed'}
            ]);

            filterModel.clear();
            await wait();

            expect(filterModel.getColumnFilters('region')).toEqual([]);
            expect(filterModel.getColumnFilters('qty')).toEqual([]);
            expect(ids(store.records)).toEqual([1, 2, 4]);
        });
    });
});

//------------------
// Helpers
//------------------
function createGridModel(config: GridConfig): GridModel {
    const store = new Store({
        fields: ['name', 'region', 'status', {name: 'qty', type: 'int'}],
        data: [
            {id: 1, name: 'Ann', region: 'US', status: 'Open', qty: 10},
            {id: 2, name: 'Bob', region: 'US', status: 'Open', qty: 2},
            {id: 3, name: 'Cid', region: null, status: 'Closed', qty: 4},
            {id: 4, name: 'Dee', region: 'EU', status: 'Open', qty: 8}
        ]
    });
    const ret = new GridModel({
        sizingMode: 'standard',
        store,
        columns: [{field: 'name'}, {field: 'region'}, {field: 'status'}, {field: 'qty'}],
        ...config
    });
    onTestFinished(() => {
        ret.destroy();
        store.destroy();
    });
    return ret;
}

function specFields(filterModel: GridFilterModel): string[] {
    return filterModel.fieldSpecs.map(it => it.field);
}

function columnFilters(filterModel: GridFilterModel, field: string) {
    return filterModel.getColumnFilters(field).map(it => it.toJSON());
}

function ids(records: StoreRecord[]) {
    return records.map(it => it.id);
}
