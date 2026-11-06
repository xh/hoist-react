/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ColumnOrGroup, ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {ColumnGroup} from '@xh/hoist/cmp/grid';
import {ColumnWidthCalculator} from '@xh/hoist/cmp/grid/impl/ColumnWidthCalculator';
import type {PlainObject} from '@xh/hoist/core';
import {XH} from '@xh/hoist/core';
import {Cube, type QueryConfig} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {wait} from '@xh/hoist/promise';
import {find, isFunction} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';
import {CubeGridModel} from './CubeGridModel';
import {PIVOT_GROUP_ID} from './CubeGridPivotModel';

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

        it('orders pivot paths by a sortBy comparator', () => {
            const model = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {sortBy: [(a, b) => b.label.localeCompare(a.label)]}
            });

            expect(colIds(model.gridModel.columns)).toEqual([
                'cubeLabel',
                'Tech>>sum',
                'Energy>>sum',
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
                ['pivot:total', 'collapsed']
            ]);

            const withSummary = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {showSummaries: true}
            });
            expect(showModes(withSummary.gridModel.getColumnGroup(PIVOT_GROUP_ID))).toContainEqual([
                'pivot:total',
                null
            ]);

            const collapsed = createModel({query: PIVOT_QUERY, pivotConfig: {expandLevel: 0}});
            expect(collapsed.gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(false);
        });

        it('drops the collapsed Total header when collapsedTotalHeader is false', () => {
            const model = createModel({
                    query: PIVOT_QUERY,
                    pivotConfig: {collapsedTotalHeader: false}
                }),
                region = model.gridModel.getColumnGroup(PIVOT_GROUP_ID);

            expect(region.children.map(it => [groupIdOf(it), it.groupShowMode])).toEqual([
                ['Energy', 'expanded'],
                ['Tech', 'expanded'],
                ['collapsed>>sum', 'collapsed']
            ]);
        });

        it('keeps the Total header beside expanded groups when the collapsed one is dropped', () => {
            const model = createModel({
                    query: PIVOT_QUERY,
                    pivotConfig: {showSummaries: true, collapsedTotalHeader: false}
                }),
                {gridModel} = model,
                region = gridModel.getColumnGroup(PIVOT_GROUP_ID);

            expect(region.children.map(it => [groupIdOf(it), it.groupShowMode])).toEqual([
                ['collapsed>>sum', 'collapsed'],
                ['pivot:total', 'expanded'],
                ['Energy', 'expanded'],
                ['Tech', 'expanded']
            ]);
            expect(gridModel.getColumn('collapsed>>sum').excludeFromExport).toBe(true);
            expect(gridModel.getColumn('total>>sum').excludeFromExport).toBeFalsy();
        });

        it('expands pivot groups to a level, with the region at level 0', () => {
            const model = createModel({query: PIVOT_QUERY}),
                {gridModel} = model;

            model.pivotModel.expandToLevel(0);
            expect(gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(false);
            expect(model.pivotModel.expandLevel).toBe(0);

            model.pivotModel.expandToLevel(1);
            expect(gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(true);

            model.pivotModel.collapseAll();
            expect(gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(false);
            model.pivotModel.expandAll();
            expect(gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(true);
        });

        it('fixes every group open when groupsCollapsible is false', () => {
            const model = createModel({
                    query: PIVOT_QUERY,
                    pivotConfig: {groupsCollapsible: false}
                }),
                region = model.gridModel.getColumnGroup(PIVOT_GROUP_ID);

            expect(region.children.every(it => it.groupShowMode == null)).toBe(true);
            expect(colIds(model.gridModel.columns)).toEqual([
                'cubeLabel',
                'Energy>>sum',
                'Tech>>sum'
            ]);

            const withSummary = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {groupsCollapsible: false, showSummaries: true}
            });
            expect(colIds(withSummary.gridModel.columns)).toContain('total>>sum');
        });

        it('lets a fixed column and the row summary bind the same measure', () => {
            const model = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'sum'}],
                    pivotConfig: {showSummaries: true}
                }),
                {gridModel} = model;

            expect(colIds(gridModel.columns)).toEqual([
                'cubeLabel',
                'sum',
                'total>>sum',
                'Energy>>sum',
                'Tech>>sum'
            ]);
            expect(gridModel.getColumn('total>>sum').field).toBe('sum');
        });

        it('keeps pivot columns out of the chooser and not hideable', () => {
            const {gridModel} = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {showSummaries: true}
            });

            ['Energy>>sum', 'total>>sum'].forEach(colId => {
                const col = gridModel.getColumn(colId);
                expect(col.hideable).toBe(false);
                expect(col.excludeFromChooser).toBe(true);
            });
        });

        it('places the summary columns on the side showSummaries names, within the pivot region', () => {
            const left = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'avg'}],
                    pivotConfig: {showSummaries: true}
                }),
                right = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'avg'}],
                    pivotConfig: {showSummaries: 'right'}
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

        it('rebuilds the pivot columns on restoreDefaults, at their default state', async () => {
            const cube = createCube([]),
                appFn = vi.fn(),
                model = autoDestroy(
                    new CubeGridModel({
                        cube,
                        query: PIVOT_QUERY,
                        gridConfig: {restoreDefaultsWarning: null, restoreDefaultsFn: appFn}
                    })
                ),
                {gridModel} = model;

            await cube.loadDataAsync(TRADES);
            gridModel.updateColumnState([{colId: 'Tech>>sum', width: 321}]);
            await gridModel.restoreDefaultsAsync();

            expect(colIds(gridModel.columns)).toEqual([
                'cubeLabel',
                'Energy>>sum',
                'Tech>>sum',
                'total>>sum'
            ]);
            expect(find(gridModel.columnState, {colId: 'Tech>>sum'}).width).not.toBe(321);
            expect(appFn).toHaveBeenCalledOnce();
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
describe('pivot columnSpecFn', () => {
    it('merges overrides over the measure spec by path, field and kind', () => {
        const model = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {
                    showSummaries: true,
                    columns: [{field: 'sum', width: 100, align: 'right'}],
                    columnSpecFn: ({path, kind, spec}) =>
                        kind === 'total'
                            ? {cellClass: 'is-total'}
                            : path.label === 'Tech'
                              ? {width: spec.width + 50, colId: 'ignored'}
                              : null
                }
            }),
            cols = model.gridModel.getLeafColumns(),
            tech = find(cols, {field: 'Tech>>sum'}),
            energy = find(cols, {field: 'Energy>>sum'}),
            total = find(cols, {colId: 'total>>sum'});

        expect(tech.width).toBe(150);
        expect(tech.align).toBe('right');
        expect(energy.width).toBe(100);
        expect(total.cellClass).toEqual(['xh-cube-grid__total-cell', 'is-total']);
        expect(total.width).toBe(100);
        expect(find(cols, {colId: 'ignored'})).toBeUndefined();
    });
});

describe('export names', () => {
    const exportNameOf = (gridModel: GridModel, colId: string) => {
        const column = gridModel.getColumn(colId),
            {exportName} = column;
        return isFunction(exportName)
            ? exportName({column, gridModel, agParams: null})
            : exportName;
    };

    it('joins the path labels and header, ignoring an exportName shared with the fixed columns', () => {
        const query = {
                ...PLAIN_QUERY,
                pivot: {dimensions: ['sector', 'book'], valueFields: ['sum']}
            },
            shared: ColumnSpec = {field: 'sum', headerName: 'Sum', exportName: 'Shared'},
            model = createModel({
                query,
                columns: [shared],
                pivotConfig: {
                    showSummaries: true,
                    columns: [shared],
                    columnSpecFn: ({path}) =>
                        path.label === 'Energy' ? {headerName: 'Energy sum'} : null
                }
            }),
            {gridModel} = model;

        expect(exportNameOf(gridModel, 'Tech>>A>>sum')).toBe('Tech › A › Sum');
        expect(exportNameOf(gridModel, 'total>>Tech>>sum')).toBe('Tech › Total › Sum');
        expect(exportNameOf(gridModel, 'total>>sum')).toBe('Total › Sum');
        expect(exportNameOf(gridModel, 'total>>Energy>>sum')).toBe('Energy › Total › Energy sum');
        expect(exportNameOf(gridModel, 'sum')).toBe('Shared');
    });
});

describe('column filtering', () => {
    it('binds the filter model to the view by default, or to the store when asked', () => {
        const byDefault = createModel({query: PIVOT_QUERY, gridConfig: {filterModel: true}}),
            toView = createModel({query: PIVOT_QUERY, gridConfig: {filterModel: {bind: 'view'}}}),
            toStore = createModel({query: PIVOT_QUERY, gridConfig: {filterModel: {bind: 'store'}}});

        expect(byDefault.gridModel.filterModel.bind).toBe(byDefault.view);
        expect(toView.gridModel.filterModel.bind).toBe(toView.view);
        expect(toStore.gridModel.filterModel.bind).toBe(toStore.store);
        // Specs cover the query's fields, never the store's cell fields.
        [byDefault, toStore].forEach(model => {
            const fields = model.gridModel.filterModel.fieldSpecs.map(it => it.field);
            expect(fields.sort()).toEqual(['avg', 'region', 'sector', 'sum']);
        });
        expect(createModel({query: PIVOT_QUERY}).gridModel.filterModel).toBeNull();
    });

    it('never makes a pivot column filterable, even from a shared filterable spec', () => {
        const shared: ColumnSpec = {field: 'sum', filterable: true},
            {gridModel} = createModel({
                query: PIVOT_QUERY,
                columns: [shared],
                gridConfig: {filterModel: true},
                pivotConfig: {columns: [shared]}
            });

        expect(gridModel.getColumn('sum').filterable).toBe(true);
        expect(gridModel.getColumn('Tech>>sum').filterable).toBe(false);
    });
});

describe('summary column classes', () => {
    it('marks summary cells, headers and the Total group, leaving pivot cells unmarked', () => {
        const model = createModel({query: PIVOT_QUERY, pivotConfig: {showSummaries: true}}),
            cols = model.gridModel.getLeafColumns(),
            total = find(cols, {colId: 'total>>sum'}),
            cell = find(cols, {colId: 'Tech>>sum'}),
            group = find(allGroups(model.gridModel.columns), {groupId: `${PIVOT_GROUP_ID}:total`});

        expect(total.cellClass).toEqual(['xh-cube-grid__total-cell']);
        expect(total.headerClass).toEqual(['xh-cube-grid__total-header']);
        expect(group.headerClass).toEqual(['xh-cube-grid__total-header']);
        expect(cell.cellClass).toBeFalsy();
        expect(cell.headerClass).toBeFalsy();
    });

    it('keeps an app class function on a summary column, adding the total class', () => {
        const model = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {
                    showSummaries: true,
                    columns: [
                        {field: 'sum', cellClass: () => 'is-app', headerClass: () => 'is-app'}
                    ]
                }
            }),
            total = find(model.gridModel.getLeafColumns(), {colId: 'total>>sum'}),
            cellClass = total.cellClass as (...args: any[]) => string[],
            headerClass = total.headerClass as (...args: any[]) => string[];

        expect(cellClass()).toEqual(['xh-cube-grid__total-cell', 'is-app']);
        expect(headerClass()).toEqual(['xh-cube-grid__total-header', 'is-app']);
    });
});

describe('pivot columnGroupSpecFn', () => {
    it('merges overrides over each group by path and kind, keeping identity', () => {
        const model = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {
                    showSummaries: true,
                    columnGroupSpecFn: ({path, kind, spec}) =>
                        kind === 'total'
                            ? {headerClass: 'is-total', groupId: 'ignored'}
                            : path.isRoot
                              ? {headerAlign: 'center'}
                              : {headerName: `${spec.headerName}`.toUpperCase()}
                }
            }),
            groups = allGroups(model.gridModel.columns),
            region = find(groups, {groupId: PIVOT_GROUP_ID}),
            tech = find(groups, {groupId: 'Tech'}),
            total = find(groups, {groupId: `${PIVOT_GROUP_ID}:total`});

        expect(region.headerAlign).toBe('center');
        expect(tech.headerName).toBe('TECH');
        expect(total.headerClass).toEqual(['xh-cube-grid__total-header', 'is-total']);
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

// The DOM has no layout under test, so a label measures 10px per character, plus the 5px
// autosize buffer. An autosize is simulated by writing widths while the autosize task runs.
describe('pivot column widths', () => {
    beforeAll(() => initTestAppAsync());

    const PIVOT_COLS = ['Energy>>sum', 'Tech>>sum', 'total>>sum'],
        widthsOf = (model: CubeGridModel, colIds = PIVOT_COLS) =>
            colIds.map(colId => model.gridModel.getStateForColumn(colId).width),
        autosize = async (model: CubeGridModel, widths: number[], colIds = PIVOT_COLS) => {
            let done: () => void;
            new Promise<void>(resolve => (done = resolve)).linkTo(model.gridModel.autosizeTask);
            model.gridModel.updateColumnState(
                colIds.map((colId, idx) => ({colId, width: widths[idx]}))
            );
            done();
            await wait();
        },
        measureByLength = () => {
            const spy = vi
                .spyOn(ColumnWidthCalculator.prototype, 'calcHeaderTextWidth')
                .mockImplementation((_, text) => text.length * 10);
            onTestFinished(() => spy.mockRestore());
        },
        // Labels of 21 characters, so 215px wanted and capped.
        longLabels = ({path}) => ({headerName: `${path.label} Long Label`.padEnd(21, '.')});

    it('gives every pivot column of a measure the widest autosized width', async () => {
        const model = createModel({
            query: PIVOT_QUERY,
            pivotConfig: {columnSizing: {headerFitMaxWidth: 0}}
        });

        await autosize(model, [50, 70, 60]);
        expect(widthsOf(model)).toEqual([70, 70, 70]);
    });

    it('leaves each column its own width when turned off', async () => {
        const model = createModel({query: PIVOT_QUERY, pivotConfig: {columnSizing: false}});

        await autosize(model, [50, 70, 60]);
        expect(widthsOf(model)).toEqual([50, 70, 60]);

        model.gridModel.updateColumnState([{colId: 'Tech>>sum', width: 90}]);
        expect(widthsOf(model)).toEqual([50, 90, 60]);
    });

    it('moves every pivot column of a measure with a manual resize', async () => {
        const model = createModel({
            query: PIVOT_QUERY,
            pivotConfig: {columnSizing: {headerFitMaxWidth: 0}}
        });
        await autosize(model, [50, 70, 60]);

        model.gridModel.updateColumnState([{colId: 'Tech>>sum', width: 90}]);
        expect(widthsOf(model)).toEqual([90, 90, 90]);
    });

    it('widens for a label only up to headerFitMaxWidth, while data may go past it', async () => {
        measureByLength();
        const model = createModel({
            query: PIVOT_QUERY,
            pivotConfig: {columnGroupSpecFn: longLabels, columnSizing: {headerFitMaxWidth: 120}}
        });

        await autosize(model, [50, 50, 50]);
        expect(widthsOf(model)).toEqual([120, 120, 120]);

        await autosize(model, [50, 150, 50]);
        expect(widthsOf(model)).toEqual([150, 150, 150]);
    });

    it('autosizes a managed grid when the sizing changes', () => {
        const model = createModel({
                query: PIVOT_QUERY,
                gridConfig: {autosizeOptions: {mode: 'managed'}},
                pivotConfig: {columnSizing: {headerFitMaxWidth: 140}}
            }),
            spy = vi.spyOn(model.gridModel, 'autosizeAsync');

        model.pivotModel.columnSizing = {headerFitMaxWidth: 140};
        expect(spy).not.toHaveBeenCalled();

        model.pivotModel.columnSizing = false;
        expect(spy).toHaveBeenCalledOnce();
    });

    it('shares a label shortfall evenly, so a narrow measure is not ballooned', async () => {
        measureByLength();
        const colIds = [
                'Energy>>sum',
                'Energy>>avg',
                'Tech>>sum',
                'Tech>>avg',
                'total>>sum',
                'total>>avg'
            ],
            model = createModel({
                query: {
                    ...PIVOT_QUERY,
                    pivot: {dimensions: ['sector'], valueFields: ['sum', 'avg']}
                },
                pivotConfig: {
                    // 'Energy Fixed Inc' wants 165px, capped at 140 - 30px more than its
                    // columns' data.
                    columnGroupSpecFn: ({path}) =>
                        path.label === 'Energy' ? {headerName: 'Energy Fixed Inc'} : null
                }
            });

        await autosize(model, [30, 80, 30, 80, 30, 80], colIds);
        expect(colIds.map(id => model.gridModel.getStateForColumn(id).width)).toEqual([
            45, 95, 45, 95, 45, 95
        ]);
    });

    it.each([
        [true, 'total>>sum'],
        [false, 'collapsed>>sum']
    ])(
        'fits a collapsed group label over its summary, and lets go on expand (Total header %s)',
        async (collapsedTotalHeader, summaryColId) => {
            measureByLength();
            const colIds = ['Energy>>sum', 'Tech>>sum', summaryColId];
            const model = createModel({
                    query: PIVOT_QUERY,
                    pivotConfig: {
                        collapsedTotalHeader,
                        // 'Region Long Label' wants 175px, capped at 140.
                        columnGroupSpecFn: ({path, kind}) =>
                            path.isRoot && kind === 'path'
                                ? {headerName: 'Region Long Label'}
                                : null
                    }
                }),
                {gridModel} = model;
            await autosize(model, [50, 50, 50], colIds);

            // Expanded, the region label spans the two path columns.
            expect(widthsOf(model, colIds)).toEqual([70, 70, 70]);

            // Collapsed, it spans only the summary column.
            gridModel.setColumnGroupExpanded(PIVOT_GROUP_ID, false);
            expect(widthsOf(model, colIds)).toEqual([140, 140, 140]);

            gridModel.setColumnGroupExpanded(PIVOT_GROUP_ID, true);
            expect(widthsOf(model, colIds)).toEqual([70, 70, 70]);
        }
    );
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
