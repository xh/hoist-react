/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import type {PersistOptions, PlainObject} from '@xh/hoist/core';
import type {DashViewModel} from '@xh/hoist/desktop/cmp/dash';
import {initTestAppAsync} from '@xh/hoist/test';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * GridModel persistence via `persistWith` - the grid layouts users save to prefs, local storage,
 * dashboards and ViewManager views. Saved state must keep its format, survive the columns of a
 * grid changing between releases, and clear itself when the grid returns to its defaults.
 *
 * Tests persist to an in-memory CustomProvider store, which every built-in provider builds on.
 */
describe('GridModel', () => {
    beforeAll(() => initTestAppAsync());

    describe('persistWith', () => {
        it('writes changed column, sort, grouping and expand state in its saved format', () => {
            const store = new MemoryStore(),
                gridModel = createGridModel({persistWith: store.options});

            gridModel.updateColumnState(['pnl', 'trader', 'region', 'qty'].map(colId => ({colId})));
            gridModel.hideColumn('qty');
            gridModel.setSortBy({colId: 'pnl', sort: 'desc', abs: true});
            gridModel.setGroupBy('region');
            gridModel.collapseAll();

            expect(store.data).toEqual({
                grid: {
                    columns: [
                        {
                            colId: 'pnl',
                            width: 100,
                            hidden: false,
                            pinned: null,
                            manuallySized: true
                        },
                        {
                            colId: 'trader',
                            width: 120,
                            hidden: false,
                            pinned: null,
                            manuallySized: true
                        },
                        {
                            colId: 'region',
                            width: 80,
                            hidden: false,
                            pinned: null,
                            manuallySized: true
                        },
                        {colId: 'qty', hidden: true}
                    ],
                    sortBy: ['pnl|desc|abs'],
                    groupBy: ['region'],
                    expandLevel: 0
                }
            });
        });

        it('restores saved state into a newly created grid', () => {
            const store = new MemoryStore(),
                gridModel = createGridModel({persistWith: store.options});

            gridModel.updateColumnState(['pnl', 'trader', 'region', 'qty'].map(colId => ({colId})));
            gridModel.updateColumnState([{colId: 'trader', width: 250, pinned: 'left'}]);
            gridModel.hideColumn('qty');
            gridModel.setSortBy({colId: 'pnl', sort: 'desc', abs: true});
            gridModel.setGroupBy('region');

            const restored = createGridModel({persistWith: store.options});
            expect(restored.persistableColumnState).toEqual(gridModel.persistableColumnState);
            expect(restored.sortBy).toEqual(gridModel.sortBy);
            expect(restored.groupBy).toEqual(['region']);
        });

        it('applies state saved by an older release, showing columns new to the code', () => {
            const savedState = {
                    grid: {
                        columns: [
                            {colId: 'region', width: 80, hidden: false},
                            {colId: 'removedCol', width: 80, hidden: false},
                            {colId: 'trader', width: 200, hidden: false, manuallySized: true}
                        ],
                        sortBy: ['removedCol|desc']
                    }
                },
                gridModel = createGridModel({persistWith: new MemoryStore(savedState).options});

            expect(gridModel.columnState.map(it => it.colId)).toEqual([
                'region',
                'trader',
                'pnl',
                'qty'
            ]);
            expect(gridModel.getStateForColumn('trader').width).toBe(200);
            expect(gridModel.getVisibleLeafColumns()).toHaveLength(4);
            expect(gridModel.sortBy.map(it => it.toString())).toEqual(['trader|asc']);
        });

        it('hides columns new to the code by default when persisting to a dashboard view', () => {
            // Changed in 87.0.0 (#4537) - a release must not add columns to curated views.
            const viewState = {grid: {columns: [{colId: 'trader', width: 120, hidden: false}]}},
                dashViewModel = new FakeDashViewModel(viewState) as unknown as DashViewModel,
                gridModel = createGridModel({persistWith: {dashViewModel, debounce: 0}});

            expect(gridModel.getVisibleLeafColumns().map(it => it.colId)).toEqual(['trader']);

            // Apps opt out with hideNewColumns: false, as documented for the 87.0.0 upgrade.
            const optOutViewModel = new FakeDashViewModel(viewState) as unknown as DashViewModel,
                optOutModel = createGridModel({
                    persistWith: {
                        dashViewModel: optOutViewModel,
                        hideNewColumns: false,
                        debounce: 0
                    }
                });

            expect(optOutModel.getVisibleLeafColumns()).toHaveLength(4);
        });

        it('clears saved state when the grid is restored to its defaults', async () => {
            const store = new MemoryStore(),
                gridModel = createGridModel({
                    persistWith: store.options,
                    restoreDefaultsWarning: null
                });

            gridModel.hideColumn('qty');
            gridModel.setSortBy('pnl|desc');
            gridModel.setGroupBy('region');
            expect(store.data.grid).toBeDefined();

            await gridModel.restoreDefaultsAsync();
            expect(store.data).toEqual({});
        });

        it('respects options given for each kind of state', () => {
            // Fixed in 72.1.0 - explicit persistGrouping options were ignored.
            const store = new MemoryStore(),
                groupingStore = new MemoryStore(),
                gridModel = createGridModel({
                    persistWith: {
                        ...store.options,
                        persistSort: false,
                        persistGrouping: groupingStore.options
                    }
                });

            gridModel.hideColumn('qty');
            gridModel.setSortBy('pnl|desc');
            gridModel.setGroupBy('region');

            expect(Object.keys(store.data.grid)).toEqual(['columns']);
            expect(groupingStore.data).toEqual({grid: {groupBy: ['region']}});
        });
    });
});

//------------------
// Helpers
//------------------
function createGridModel(config: GridConfig = {}): GridModel {
    const ret = new GridModel({
        sizingMode: 'standard',
        columns: [
            {field: 'trader', width: 120},
            {field: 'region', width: 80},
            {field: 'pnl', width: 100},
            {field: 'qty', width: 60}
        ],
        sortBy: 'trader',
        ...config
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

/** In-memory backing store for a CustomProvider, writing without a debounce. */
class MemoryStore {
    data: PlainObject;

    constructor(data: PlainObject = {}) {
        this.data = data;
    }

    get options(): PersistOptions {
        return {getData: () => this.data, setData: data => (this.data = data), debounce: 0};
    }
}

/** The slice of DashViewModel that its persistence provider reads and writes. */
class FakeDashViewModel {
    viewState: PlainObject;

    constructor(viewState: PlainObject) {
        this.viewState = viewState;
    }

    registerProvider() {}
    unregisterProvider() {}
}
