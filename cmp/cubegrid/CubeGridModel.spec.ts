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
                'total>>sum'
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
                ['total>>sum', 'collapsed']
            ]);

            const withSummary = createModel({query: PIVOT_QUERY, pivotValueSummary: true});
            expect(showModes(withSummary.gridModel.getColumnGroup(PIVOT_GROUP_ID))).toContainEqual([
                'total>>sum',
                'always'
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
                pivotValueSummary: true
            });
            expect(colIds(withSummary.gridModel.columns)).toContain('total>>sum');
        });

        it('lets a fixed column and the row summary bind the same measure', () => {
            const model = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'sum'}],
                    pivotValueSummary: true
                }),
                {gridModel} = model;

            expect(colIds(gridModel.columns)).toEqual([
                'cubeLabel',
                'sum',
                'Energy>>sum',
                'Tech>>sum',
                'total>>sum'
            ]);
            expect(gridModel.getColumn('total>>sum').field).toBe('sum');
        });

        it('leaves pivot columns hideable unless a value column spec locks them', () => {
            const open = createModel({query: PIVOT_QUERY}),
                locked = createModel({
                    query: PIVOT_QUERY,
                    pivotValueSpecs: {sum: {hideable: false}}
                });

            expect(open.gridModel.getColumn('Energy>>sum').hideable).toBe(true);
            expect(locked.gridModel.getColumn('Energy>>sum').hideable).toBe(false);
        });

        it('places the summary column on the side pivotValueSummary names, within the pivot region', () => {
            const right = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'avg'}],
                    pivotValueSummary: true
                }),
                left = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'avg'}],
                    pivotValueSummary: 'left'
                });

            expect(colIds(right.gridModel.columns)).toEqual([
                'cubeLabel',
                'avg',
                'Energy>>sum',
                'Tech>>sum',
                'total>>sum'
            ]);
            expect(colIds(left.gridModel.columns)).toEqual([
                'cubeLabel',
                'avg',
                'total>>sum',
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
                'total>>sum'
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
                'total>>sum'
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
            expect(savedColIds()).toEqual(['cubeLabel', 'Energy>>sum', 'Tech>>sum', 'total>>sum']);
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
                'total>>sum'
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
                'total>>sum'
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
                'total>>sum'
            ]);
        });
    });
});

//------------------------
// Fixtures
//------------------------
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

function groupIdOf(it: ColumnOrGroup): string {
    return it instanceof ColumnGroup ? it.groupId : it.colId;
}

/** Leaf column ids in display order, descending through groups. */
function colIds(cols: ColumnOrGroup[]): string[] {
    return cols.flatMap(it => (it instanceof ColumnGroup ? colIds(it.children) : it.colId));
}
