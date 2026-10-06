/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Column, type GridConfig, GridModel, GridSorter} from '@xh/hoist/cmp/grid';
import {XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * GridModel sorting, grouping, store/column inference and restore-to-defaults, without rendering.
 * Nearly every app screen is a GridModel, and apps configure sort and grouping in code, persist
 * them in saved views, and lean on columns and Store fields filling in each other's config.
 */
describe('GridModel', () => {
    beforeAll(() => initTestAppAsync());

    describe('setSortBy', () => {
        it('accepts strings, specs and GridSorters, alone or in a list', () => {
            const gridModel = createGridModel();

            gridModel.setSortBy('name|desc');
            expect(sorts(gridModel)).toEqual(['name|desc']);

            gridModel.setSortBy([
                'region',
                {colId: 'pnl', sort: 'desc', abs: true},
                new GridSorter({colId: 'name'})
            ]);
            expect(sorts(gridModel)).toEqual(['region|asc', 'pnl|desc|abs', 'name|asc']);
            expect(gridModel.sortBy[1]).toBeInstanceOf(GridSorter);

            gridModel.setSortBy(null);
            expect(gridModel.sortBy).toEqual([]);
        });

        it('ignores a sort on an unknown column, keeping the current sort', () => {
            // E.g. a sort saved before the column was removed from the app.
            const gridModel = createGridModel({sortBy: 'pnl|desc'});

            gridModel.setSortBy(['name', 'removedCol']);
            expect(sorts(gridModel)).toEqual(['pnl|desc']);
        });

        it("accepts a sort on ag-Grid's auto group column", () => {
            const gridModel = createGridModel({groupBy: 'region'});

            gridModel.setSortBy('ag-Grid-AutoColumn|desc');
            expect(sorts(gridModel)).toEqual(['ag-Grid-AutoColumn|desc']);
        });
    });

    describe('setGroupBy', () => {
        it('ungroups the grid when any column id is unknown', () => {
            // Unlike setSortBy(), which keeps the current sort.
            const gridModel = createGridModel({groupBy: 'region'});

            gridModel.setGroupBy(['name', 'removedCol']);
            expect(gridModel.groupBy).toEqual([]);
        });
    });

    describe('columns and store', () => {
        it('applies Store field metadata to columns, with column config taking precedence', () => {
            const gridModel = createGridModel({
                store: {
                    fields: [
                        {name: 'name', displayName: 'Trader'},
                        {
                            name: 'pnl',
                            type: 'number',
                            displayName: 'P&L',
                            description: 'Profit and loss'
                        },
                        {name: 'qty', type: 'int'},
                        {name: 'tradeDate', type: 'localDate'}
                    ]
                },
                columns: [
                    {field: 'name', displayName: 'Name'},
                    {field: 'pnl'},
                    {field: 'qty', absSort: true},
                    {field: 'tradeDate'}
                ]
            });

            const name = gridModel.getColumn('name'),
                pnl = gridModel.getColumn('pnl'),
                qty = gridModel.getColumn('qty'),
                tradeDate = gridModel.getColumn('tradeDate');

            expect(name.displayName).toBe('Name');
            expect(name.sortingOrder).toEqual(Column.ASC_FIRST);

            expect(pnl).toMatchObject({
                displayName: 'P&L',
                headerName: 'P&L',
                headerTooltip: 'Profit and loss',
                align: 'right'
            });
            expect(pnl.sortingOrder).toEqual(Column.DESC_FIRST);

            expect(qty.sortingOrder).toEqual(Column.ABS_DESC_FIRST);
            expect(tradeDate.sortingOrder).toEqual(Column.DESC_FIRST);
        });

        it('creates Store fields for columns the Store config does not define', () => {
            const gridModel = createGridModel({
                store: {fields: [{name: 'region', type: 'string'}]},
                columns: [
                    {field: 'id'},
                    {field: 'trader.name'},
                    {field: {name: 'qty', type: 'int', displayName: 'Quantity'}},
                    {field: 'region'}
                ]
            });
            const {store} = gridModel;

            expect(store.fields.map(it => it.name)).toEqual(['region', 'trader', 'qty']);
            expect(store.getField('qty')).toMatchObject({type: 'int', displayName: 'Quantity'});

            store.loadData([{id: 1, trader: {name: 'Bob'}, qty: '12', region: 'US'}]);
            expect(store.getById(1).data).toEqual({
                id: 1,
                trader: {name: 'Bob'},
                qty: 12,
                region: 'US'
            });
        });
    });

    describe('restoreDefaultsAsync', () => {
        it('restores the column, sort, grouping, expand and filter state set in code', async () => {
            const restoreDefaultsFn = vi.fn(),
                gridModel = createGridModel({
                    columns: [{field: 'name'}, {field: 'region', hidden: true}, {field: 'pnl'}],
                    store: {filter: {field: 'region', op: '=', value: 'US'}},
                    filterModel: true,
                    sortBy: 'pnl|desc',
                    groupBy: 'region',
                    restoreDefaultsWarning: null,
                    restoreDefaultsFn
                }),
                {filterModel, store} = gridModel,
                defaultColumnState = gridModel.columnState;

            gridModel.updateColumnState([
                {colId: 'pnl', width: 200},
                {colId: 'region', hidden: false},
                {colId: 'name'}
            ]);
            gridModel.hideColumn('name');
            gridModel.setSortBy('name');
            gridModel.setGroupBy(null);
            gridModel.collapseAll();
            filterModel.setColumnFilters('pnl', {field: 'pnl', op: '>', value: 0});
            await wait();

            expect(await gridModel.restoreDefaultsAsync()).toBe(true);
            await wait();

            expect(gridModel.columnState).toEqual(defaultColumnState);
            expect(sorts(gridModel)).toEqual(['pnl|desc']);
            expect(gridModel.groupBy).toEqual(['region']);
            expect(gridModel.expandLevel).toBe(1);
            expect(store.filter.toJSON()).toEqual({field: 'region', op: '=', value: 'US'});
            expect(restoreDefaultsFn).toHaveBeenCalledOnce();
        });

        it('leaves the grid unchanged if the user declines to confirm', async () => {
            const confirm = vi.spyOn(XH, 'confirm').mockResolvedValue(false),
                gridModel = createGridModel({sortBy: 'pnl|desc'});

            gridModel.setSortBy('name');

            expect(await gridModel.restoreDefaultsAsync()).toBe(false);
            expect(confirm).toHaveBeenCalledOnce();
            expect(sorts(gridModel)).toEqual(['name|asc']);
        });
    });
});

//------------------
// Helpers
//------------------
function createGridModel(config: GridConfig = {}): GridModel {
    const ret = new GridModel({
        sizingMode: 'standard',
        columns: [{field: 'name'}, {field: 'region'}, {field: 'pnl', absSort: true}],
        ...config
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

function sorts(gridModel: GridModel): string[] {
    return gridModel.sortBy.map(it => it.toString());
}
