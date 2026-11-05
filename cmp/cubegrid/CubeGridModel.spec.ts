/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ColumnOrGroup} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid';
import type {PlainObject} from '@xh/hoist/core';
import {XH} from '@xh/hoist/core';
import {Cube, type QueryConfig} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {find} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';
import {CubeGridModel, PIVOT_GROUP_ID} from './CubeGridModel';

/**
 * CubeGridModel is the grid for any Cube view. These tests pin its layout contract: the app's
 * fixed columns come first, with a default label column unless the app supplies a tree column,
 * and pivot path groups are appended to the right only when the query pivots. They also pin view
 * ownership - a view created from `cube` and `query` dies with the model, a supplied one does not.
 */
describe('CubeGridModel', () => {
    beforeAll(() => initTestAppAsync());

    describe('view ownership', () => {
        it('creates a connected view from cube and query, and destroys it with the model', () => {
            const cube = createCube(TRADES),
                model = new CubeGridModel({cube, query: PLAIN_QUERY}),
                {view} = model;

            expect(view.cube).toBe(cube);
            expect(view.isConnected).toBe(true);
            expect(model.store.count).toBeGreaterThan(0);

            model.destroy();
            expect(view.isDestroyed).toBe(true);
        });

        it('binds a supplied view without owning it', () => {
            const cube = createCube(TRADES),
                view = autoDestroy(cube.createView({query: PLAIN_QUERY, connect: true})),
                model = new CubeGridModel({view});

            expect(model.view).toBe(view);
            model.destroy();
            expect(view.isDestroyed).toBe(false);
            expect(view.stores).not.toContain(model.store);
        });

        it('requires exactly one of view or cube', () => {
            const cube = createCube(TRADES),
                view = autoDestroy(cube.createView({query: PLAIN_QUERY}));

            expect(() => new CubeGridModel({})).toThrow(/view.*cube/);
            expect(() => new CubeGridModel({view, cube, query: PLAIN_QUERY})).toThrow(/not both/);
        });
    });

    describe('columns', () => {
        it('shows a label column and the fixed columns for a query with no pivot', () => {
            const model = createModel({query: PLAIN_QUERY, columns: [{field: 'sum'}]});

            expect(colIds(model.gridModel.columns)).toEqual(['cubeLabel', 'sum']);
            expect(model.gridModel.getColumn('cubeLabel')).toMatchObject({
                isTreeColumn: true,
                pinned: 'left'
            });
        });

        it('lets a fixed tree column replace the default label column', () => {
            const model = createModel({
                query: PLAIN_QUERY,
                columns: [{field: 'sum'}, {field: 'cubeLabel', isTreeColumn: true, pinned: false}]
            });

            expect(colIds(model.gridModel.columns)).toEqual(['sum', 'cubeLabel']);
            expect(model.gridModel.getColumn('cubeLabel').pinned).toBeNull();
        });

        it('appends a column group per pivot path after the fixed columns', () => {
            const model = createModel({query: PIVOT_QUERY, columns: [{field: 'sum'}]});

            expect(colIds(model.gridModel.columns)).toEqual([
                'cubeLabel',
                'sum',
                'Energy>>sum',
                'Tech>>sum',
                'collapsed>>sum'
            ]);
        });

        it('spans the pivot region with a group that collapses to the row summary', () => {
            const model = createModel({query: PIVOT_QUERY}),
                region = model.gridModel.getColumnGroup(PIVOT_GROUP_ID),
                showModes = (group: ColumnGroup) =>
                    group.children.map(it => [groupIdOf(it), it.groupShowMode]);

            expect(region.headerName).toBe('Sector');
            expect(showModes(region)).toEqual([
                ['Energy', 'expanded'],
                ['Tech', 'expanded'],
                ['collapsed>>sum', 'collapsed']
            ]);

            const withSummary = createModel({query: PIVOT_QUERY, showPivotSummaries: true});
            expect(showModes(withSummary.gridModel.getColumnGroup(PIVOT_GROUP_ID))).toContainEqual([
                'pivot:total',
                'expanded'
            ]);

            const collapsed = createModel({query: PIVOT_QUERY, pivotExpandLevel: 0});
            expect(collapsed.gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(false);
        });

        it('expands pivot groups to a level, with the region at level 0', () => {
            const model = createModel({query: PIVOT_QUERY}),
                {gridModel} = model;

            model.expandPivotToLevel(0);
            expect(gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(false);
            expect(model.pivotExpandLevel).toBe(0);

            model.expandPivotToLevel(1);
            expect(gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(true);

            model.collapseAllPivotGroups();
            expect(gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(false);
            model.expandAllPivotGroups();
            expect(gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(true);
        });

        it('fixes every group open when pivotGroupsCollapsible is false', () => {
            const model = createModel({query: PIVOT_QUERY, pivotGroupsCollapsible: false}),
                region = model.gridModel.getColumnGroup(PIVOT_GROUP_ID);

            expect(region.children.every(it => it.groupShowMode == null)).toBe(true);
            expect(colIds(model.gridModel.columns)).toEqual([
                'cubeLabel',
                'Energy>>sum',
                'Tech>>sum'
            ]);

            const withSummary = createModel({
                query: PIVOT_QUERY,
                pivotGroupsCollapsible: false,
                showPivotSummaries: true
            });
            expect(colIds(withSummary.gridModel.columns)).toContain('total>>sum');
            expect(colIds(withSummary.gridModel.columns)).not.toContain('collapsed>>sum');
        });

        it('lets a fixed column and the row summary bind the same measure', () => {
            const model = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'sum'}],
                    showPivotSummaries: true
                }),
                {gridModel} = model;

            expect(colIds(gridModel.columns)).toEqual([
                'cubeLabel',
                'sum',
                'total>>sum',
                'collapsed>>sum',
                'Energy>>sum',
                'Tech>>sum'
            ]);
            expect(gridModel.getColumn('total>>sum').field).toBe('sum');
        });

        it('keeps pivot columns out of the chooser and not hideable', () => {
            const {gridModel} = createModel({query: PIVOT_QUERY, showPivotSummaries: true});

            ['Energy>>sum', 'total>>sum', 'collapsed>>sum'].forEach(colId => {
                const col = gridModel.getColumn(colId);
                expect(col.hideable).toBe(false);
                expect(col.excludeFromChooser).toBe(true);
            });
        });

        it('places the summary columns on the side showPivotSummaries names, within the pivot region', () => {
            const left = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'avg'}],
                    showPivotSummaries: true
                }),
                right = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'avg'}],
                    showPivotSummaries: 'right'
                });

            expect(colIds(right.gridModel.columns)).toEqual([
                'cubeLabel',
                'avg',
                'Energy>>sum',
                'Tech>>sum',
                'total>>sum',
                'collapsed>>sum'
            ]);
            expect(colIds(left.gridModel.columns)).toEqual([
                'cubeLabel',
                'avg',
                'total>>sum',
                'collapsed>>sum',
                'Energy>>sum',
                'Tech>>sum'
            ]);
        });

        it('drops the pivot columns when the query stops pivoting, keeping the fixed ones', () => {
            const model = createModel({query: PIVOT_QUERY, columns: [{field: 'avg'}]});

            model.view.updateQuery({pivot: null});
            expect(colIds(model.gridModel.columns)).toEqual(['cubeLabel', 'avg']);

            model.view.updateQuery({pivot: PIVOT_QUERY.pivot});
            expect(colIds(model.gridModel.columns)).toEqual([
                'cubeLabel',
                'avg',
                'Energy>>sum',
                'Tech>>sum',
                'collapsed>>sum'
            ]);
        });

        it('adds a group when data introduces a new pivot path', async () => {
            const cube = createCube(TRADES),
                model = autoDestroy(new CubeGridModel({cube, query: PIVOT_QUERY}));

            await cube.updateDataAsync({add: [trade(99, 'US', 'Health', 'A', 1)]});
            expect(colIds(model.gridModel.columns)).toEqual([
                'cubeLabel',
                'Energy>>sum',
                'Health>>sum',
                'Tech>>sum',
                'collapsed>>sum'
            ]);
        });

        it('restores persisted sort and width on a pivot column once paths exist', async () => {
            const persistWith = {localStorageKey: 'cubeGridSpec', debounce: 0},
                cube = createCube(TRADES),
                first = autoDestroy(
                    new CubeGridModel({cube, query: PIVOT_QUERY, gridConfig: {persistWith}})
                );

            first.gridModel.setSortBy('Tech>>sum|desc');
            first.gridModel.updateColumnState([{colId: 'Tech>>sum', width: 321}]);

            const emptyCube = createCube([]),
                second = autoDestroy(
                    new CubeGridModel({
                        cube: emptyCube,
                        query: PIVOT_QUERY,
                        gridConfig: {persistWith}
                    })
                );
            expect(second.gridModel.sortBy).toEqual([]);

            await emptyCube.loadDataAsync(TRADES);
            expect(second.gridModel.sortBy.map(it => it.toString())).toEqual(['Tech>>sum|desc']);
            expect(find(second.gridModel.columnState, {colId: 'Tech>>sum'}).width).toBe(321);
        });

        it('drops persisted state for pivot paths no longer in the data at the next write', async () => {
            const persistWith = {localStorageKey: 'cubeGridSpecStale', debounce: 0},
                savedColIds = () =>
                    XH.localStorageService
                        .get('cubeGridSpecStale')
                        .grid.columns.map(it => it.colId),
                first = autoDestroy(
                    new CubeGridModel({
                        cube: createCube([...TRADES, trade(99, 'US', 'Health', 'A', 1)]),
                        query: PIVOT_QUERY,
                        gridConfig: {persistWith}
                    })
                );

            first.gridModel.updateColumnState([{colId: 'Health>>sum', width: 222}]);
            expect(savedColIds()).toContain('Health>>sum');

            const second = autoDestroy(
                new CubeGridModel({
                    cube: createCube(TRADES),
                    query: PIVOT_QUERY,
                    gridConfig: {persistWith}
                })
            );
            second.gridModel.updateColumnState([{colId: 'Tech>>sum', width: 333}]);
            expect(savedColIds()).toEqual([
                'cubeLabel',
                'Energy>>sum',
                'Tech>>sum',
                'collapsed>>sum'
            ]);
        });

        it('keeps pivot columns in view order across a rebuild, with widths and fixed order kept', () => {
            const model = createModel({query: PIVOT_QUERY, columns: [{field: 'avg'}]}),
                {gridModel} = model,
                stateFor = (colId: string) => find(gridModel.columnState, {colId});

            expect(gridModel.getColumn('Tech>>sum').movable).toBe(false);

            // Simulate a drag that reverses the pivot block and pulls `avg` after it.
            gridModel.setColumnState([
                stateFor('cubeLabel'),
                {...stateFor('Tech>>sum'), width: 321},
                stateFor('Energy>>sum'),
                stateFor('avg')
            ]);
            model.columns = [{field: 'avg'}, {field: 'sum'}];

            expect(gridModel.columnState.map(it => it.colId)).toEqual([
                'cubeLabel',
                'avg',
                'sum',
                'Energy>>sum',
                'Tech>>sum',
                'collapsed>>sum'
            ]);
            expect(stateFor('Tech>>sum').width).toBe(321);
        });

        it('puts a fixed column dropped among the pivot columns back in its region', () => {
            const model = createModel({query: PIVOT_QUERY, columns: [{field: 'avg'}]}),
                {gridModel} = model,
                stateFor = (colId: string) => find(gridModel.columnState, {colId});

            gridModel.setColumnState([
                stateFor('cubeLabel'),
                stateFor('Energy>>sum'),
                stateFor('avg'),
                stateFor('Tech>>sum')
            ]);
            expect(gridModel.columnState.map(it => it.colId)).toEqual([
                'cubeLabel',
                'avg',
                'Energy>>sum',
                'Tech>>sum',
                'collapsed>>sum'
            ]);
        });

        it('rebuilds when the fixed columns change', () => {
            const model = createModel({query: PIVOT_QUERY});

            model.columns = [{field: 'avg'}];
            expect(colIds(model.gridModel.columns)).toEqual([
                'cubeLabel',
                'avg',
                'Energy>>sum',
                'Tech>>sum',
                'collapsed>>sum'
            ]);
        });
    });
});

//------------------------
// Fixtures
//------------------------
describe('pivotColumnSpecFn', () => {
    it('merges overrides over the measure spec by path, field and kind', () => {
        const model = createModel({
                query: PIVOT_QUERY,
                showPivotSummaries: true,
                pivotColumns: [{field: 'sum', width: 100, align: 'right'}],
                pivotColumnSpecFn: ({path, kind, spec}) =>
                    kind === 'total'
                        ? {cellClass: 'is-total'}
                        : path.label === 'Tech'
                          ? {width: spec.width + 50, colId: 'ignored'}
                          : null
            }),
            cols = model.gridModel.getLeafColumns(),
            tech = find(cols, {field: 'Tech>>sum'}),
            energy = find(cols, {field: 'Energy>>sum'}),
            total = find(cols, {colId: 'total>>sum'});

        expect(tech.width).toBe(150);
        expect(tech.align).toBe('right');
        expect(energy.width).toBe(100);
        expect(total.cellClass).toBe('is-total');
        expect(total.width).toBe(100);
        expect(find(cols, {colId: 'ignored'})).toBeUndefined();
    });
});

describe('pivotColumnGroupSpecFn', () => {
    it('merges overrides over each group by path and kind, keeping identity', () => {
        const model = createModel({
                query: PIVOT_QUERY,
                showPivotSummaries: true,
                pivotColumnGroupSpecFn: ({path, kind, spec}) =>
                    kind === 'total'
                        ? {headerClass: 'is-total', groupId: 'ignored'}
                        : path.isRoot
                          ? {headerAlign: 'center'}
                          : {headerName: `${spec.headerName}`.toUpperCase()}
            }),
            groups = allGroups(model.gridModel.columns),
            region = find(groups, {groupId: PIVOT_GROUP_ID}),
            tech = find(groups, {groupId: 'Tech'}),
            total = find(groups, {groupId: `${PIVOT_GROUP_ID}:total`});

        expect(region.headerAlign).toBe('center');
        expect(tech.headerName).toBe('TECH');
        expect(total.headerClass).toBe('is-total');
        expect(find(groups, {groupId: 'ignored'})).toBeUndefined();
    });
});

describe('declined results', () => {
    it('empties the grid and drops the pivot region, then rebuilds when the query fits', () => {
        const pivot = {dimensions: ['sector'], valueFields: ['sum'], maxPivotPaths: 1},
            model = createModel({query: {...PLAIN_QUERY, pivot}}),
            {gridModel, view} = model;

        expect(view.result.exception?.message).toMatch(/sector/);
        expect(gridModel.store.count).toBe(0);
        expect(gridModel.columns.some(it => groupIdOf(it) === PIVOT_GROUP_ID)).toBe(false);

        view.updateQuery({pivot: {...pivot, maxPivotPaths: null}});

        expect(view.result.exception).toBeNull();
        expect(gridModel.store.count).toBeGreaterThan(0);
        expect(gridModel.columns.some(it => groupIdOf(it) === PIVOT_GROUP_ID)).toBe(true);
    });
});

const PLAIN_QUERY: QueryConfig = {
    dimensions: ['region'],
    fields: ['sum', 'avg'],
    includeRoot: true
};

const PIVOT_QUERY: QueryConfig = {
    ...PLAIN_QUERY,
    pivot: {dimensions: ['sector'], valueFields: ['sum']}
};

const TRADES = [
    trade(1, 'US', 'Tech', 'A', 1),
    trade(2, 'US', 'Tech', 'B', 2),
    trade(3, 'US', 'Energy', 'A', 3),
    trade(4, 'EU', 'Tech', 'A', 4)
];

function trade(id: number, region: string, sector: string, book: string, qty: number): PlainObject {
    return {id, region, sector, book, qty, sum: qty, avg: qty};
}

function createCube(data: PlainObject[]): Cube {
    return autoDestroy(
        new Cube({
            fields: [
                {name: 'region', isDimension: true},
                {name: 'sector', isDimension: true},
                {name: 'book', isDimension: true},
                {name: 'qty', type: 'int'},
                {name: 'sum', type: 'int', aggregator: 'SUM'},
                {name: 'avg', type: 'number', aggregator: 'AVG'}
            ],
            data
        })
    );
}

function createModel(config: Omit<ConstructorParameters<typeof CubeGridModel>[0], 'cube'>) {
    return autoDestroy(new CubeGridModel({cube: createCube(TRADES), ...config}));
}

function autoDestroy<T extends {destroy(): void}>(obj: T): T {
    onTestFinished(() => obj.destroy());
    return obj;
}

/** Every column group, descending through nested groups. */
function allGroups(cols: ColumnOrGroup[]): ColumnGroup[] {
    return cols.flatMap(it => (it instanceof ColumnGroup ? [it, ...allGroups(it.children)] : []));
}

function groupIdOf(it: ColumnOrGroup): string {
    return it instanceof ColumnGroup ? it.groupId : it.colId;
}

/** Leaf column ids in display order, descending through groups. */
function colIds(cols: ColumnOrGroup[]): string[] {
    return cols.flatMap(it => (it instanceof ColumnGroup ? colIds(it.children) : it.colId));
}
