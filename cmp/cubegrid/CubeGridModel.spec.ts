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
import {find, isFunction, map, uniq} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';
import {CubeGridModel} from './CubeGridModel';
import {PIVOT_GROUP_ID} from './CubeGridPivotModel';
import type {PivotDimensionSpec} from './Types';

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
                'summary>>sum'
            ]);
        });

        it('orders pivot paths by a sortBy comparator', () => {
            const model = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {
                    dimensions: [
                        {field: 'sector', sortBy: (a, b) => b.value.localeCompare(a.value)}
                    ]
                }
            });

            expect(colIds(model.gridModel.columns)).toEqual([
                'cubeLabel',
                'Tech>>sum',
                'Energy>>sum',
                'summary>>sum'
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
                ['pivot:summary', 'collapsed']
            ]);

            const withSummary = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {dimensionDefaults: {showSummary: true}}
            });
            expect(showModes(withSummary.gridModel.getColumnGroup(PIVOT_GROUP_ID))).toContainEqual([
                'pivot:summary',
                null
            ]);

            const collapsed = createModel({query: PIVOT_QUERY, pivotConfig: {expandLevel: 0}});
            expect(collapsed.gridModel.isColumnGroupExpanded(PIVOT_GROUP_ID)).toBe(false);
        });

        it('drops the collapsed summary label when showCollapsedLabel is false', () => {
            const model = createModel({
                    query: PIVOT_QUERY,
                    pivotConfig: {dimensionDefaults: {showCollapsedLabel: false}}
                }),
                region = model.gridModel.getColumnGroup(PIVOT_GROUP_ID);

            expect(region.children.map(it => [groupIdOf(it), it.groupShowMode])).toEqual([
                ['Energy', 'expanded'],
                ['Tech', 'expanded'],
                ['collapsed>>sum', 'collapsed']
            ]);
        });

        it('keeps the summary label beside expanded groups when the collapsed one is dropped', () => {
            const model = createModel({
                    query: PIVOT_QUERY,
                    pivotConfig: {dimensionDefaults: {showSummary: true, showCollapsedLabel: false}}
                }),
                {gridModel} = model,
                region = gridModel.getColumnGroup(PIVOT_GROUP_ID);

            expect(region.children.map(it => [groupIdOf(it), it.groupShowMode])).toEqual([
                ['collapsed>>sum', 'collapsed'],
                ['pivot:summary', 'expanded'],
                ['Energy', 'expanded'],
                ['Tech', 'expanded']
            ]);
            expect(gridModel.getColumn('collapsed>>sum').excludeFromExport).toBe(true);
            expect(gridModel.getColumn('summary>>sum').excludeFromExport).toBeFalsy();
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

        it('fixes every group open when collapsible is false', () => {
            const model = createModel({
                    query: PIVOT_QUERY,
                    pivotConfig: {dimensionDefaults: {collapsible: false}}
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
                pivotConfig: {dimensionDefaults: {collapsible: false, showSummary: true}}
            });
            expect(colIds(withSummary.gridModel.columns)).toContain('summary>>sum');
        });

        it('lets a fixed column and the row summary bind the same measure', () => {
            const model = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'sum'}],
                    pivotConfig: {dimensionDefaults: {showSummary: true}}
                }),
                {gridModel} = model;

            expect(colIds(gridModel.columns)).toEqual([
                'cubeLabel',
                'sum',
                'summary>>sum',
                'Energy>>sum',
                'Tech>>sum'
            ]);
            expect(gridModel.getColumn('summary>>sum').field).toBe('sum');
        });

        it('keeps pivot columns out of the chooser and not hideable', () => {
            const {gridModel} = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {dimensionDefaults: {showSummary: true}}
            });

            ['Energy>>sum', 'summary>>sum'].forEach(colId => {
                const col = gridModel.getColumn(colId);
                expect(col.hideable).toBe(false);
                expect(col.excludeFromChooser).toBe(true);
            });
        });

        it('places the summary columns on the side showSummary names, within the pivot region', () => {
            const left = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'avg'}],
                    pivotConfig: {dimensionDefaults: {showSummary: true}}
                }),
                right = createModel({
                    query: PIVOT_QUERY,
                    columns: [{field: 'avg'}],
                    pivotConfig: {dimensionDefaults: {showSummary: 'right'}}
                });

            expect(colIds(right.gridModel.columns)).toEqual([
                'cubeLabel',
                'avg',
                'Energy>>sum',
                'Tech>>sum',
                'summary>>sum'
            ]);
            expect(colIds(left.gridModel.columns)).toEqual([
                'cubeLabel',
                'avg',
                'summary>>sum',
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
                'summary>>sum'
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
                'summary>>sum'
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
                'summary>>sum'
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
            expect(savedColIds()).toEqual([
                'cubeLabel',
                'Energy>>sum',
                'Tech>>sum',
                'summary>>sum'
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
                'summary>>sum'
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
                'summary>>sum'
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
                'summary>>sum'
            ]);
        });
    });
});

//------------------------
// Fixtures
//------------------------
describe('pivot dimensions and measures', () => {
    const TWO_DIM_QUERY: QueryConfig = {
        ...PLAIN_QUERY,
        pivot: {dimensions: ['sector', 'book'], measures: ['sum']}
    };

    it('gives each dimension its own summary, with named settings over the defaults', () => {
        const model = createModel({
                query: TWO_DIM_QUERY,
                pivotConfig: {
                    dimensions: [
                        {field: 'sector', summaryLabel: 'All Sectors'},
                        {field: 'book', collapsible: false, showSummary: false}
                    ],
                    dimensionDefaults: {showSummary: true, summaryLabel: 'All'}
                }
            }),
            {gridModel} = model,
            showModes = (groupId: string) =>
                gridModel
                    .getColumnGroup(groupId)
                    .children.map(it => [groupIdOf(it), it.groupShowMode]);

        // Sector's summary is the row summary, shown expanded too and labelled by its own spec.
        expect(showModes(PIVOT_GROUP_ID)).toEqual([
            ['pivot:summary', null],
            ['Energy', 'expanded'],
            ['Tech', 'expanded']
        ]);
        expect(gridModel.getColumnGroup('pivot:summary').headerName).toBe('All Sectors');

        // Book's summary is each sector's - fixed open and not asked for, so absent.
        const tech = gridModel.getColumnGroup('Tech').children;
        expect(tech.map(groupIdOf)).toEqual(['Tech>>A', 'Tech>>B']);
        expect(tech.some(it => it.groupShowMode)).toBe(false);
    });

    it('sorts a dimension by its own setting, wherever the query pivots it', () => {
        const model = createModel({
                query: TWO_DIM_QUERY,
                pivotConfig: {
                    dimensions: [
                        {field: 'book', sortBy: 'desc'},
                        {field: 'region', sortBy: 'desc'}
                    ]
                }
            }),
            {gridModel, view} = model,
            childIds = (groupId: string) =>
                gridModel.getColumnGroup(groupId).children.map(groupIdOf);

        expect(childIds('Tech')).toEqual(['Tech>>B', 'Tech>>A', 'Tech:summary']);

        view.updateQuery({pivot: {dimensions: ['book', 'sector'], measures: ['sum']}});
        expect(childIds(PIVOT_GROUP_ID)).toEqual(['B', 'A', 'pivot:summary']);
    });

    it('orders measures by their specs, with measureDefaults under each column', () => {
        const model = createModel({
                query: {...PIVOT_QUERY, pivot: {dimensions: ['sector'], measures: ['sum', 'avg']}},
                pivotConfig: {
                    measures: [{field: 'avg', column: {width: 88}}],
                    measureDefaults: {column: {width: 77, align: 'center'}}
                }
            }),
            {gridModel} = model;

        expect(colIds(gridModel.getColumnGroup('Energy').children)).toEqual([
            'Energy>>avg',
            'Energy>>sum'
        ]);
        expect(gridModel.getColumn('Energy>>avg')).toMatchObject({width: 88, align: 'center'});
        expect(gridModel.getColumn('Energy>>sum')).toMatchObject({width: 77, align: 'center'});
    });

    it('offers the listed dimensions and measures, in their order', () => {
        const {pivotModel} = createModel({
            query: PIVOT_QUERY,
            pivotConfig: {
                dimensions: [{field: 'book'}, {field: 'sector'}],
                measures: [{field: 'avg'}]
            }
        });

        expect(map(pivotModel.availableDimensions, 'name')).toEqual(['book', 'sector']);
        expect(map(pivotModel.availableMeasures, 'name')).toEqual(['avg']);
    });

    it('rejects a listed field the cube cannot pivot as listed', () => {
        const {pivotModel} = createModel({
            query: PIVOT_QUERY,
            pivotConfig: {dimensions: [{field: 'qty'}], measures: [{field: 'region'}]}
        });

        expect(() => pivotModel.availableDimensions).toThrow(/'qty' is not a dimension/);
        expect(() => pivotModel.availableMeasures).toThrow(/'region' is not a measure/);
    });

    it("offers all of the cube's dimensions and measures when none are listed", () => {
        const {pivotModel} = createModel({query: PIVOT_QUERY});

        expect(map(pivotModel.availableDimensions, 'name')).toEqual(['region', 'sector', 'book']);
        expect(map(pivotModel.availableMeasures, 'name')).toEqual(['sum', 'avg']);
    });
});

describe('pivot labels and classes', () => {
    const SECTOR_BOOK_QUERY: QueryConfig = {
        ...PLAIN_QUERY,
        pivot: {dimensions: ['sector', 'book'], measures: ['sum']}
    };

    it("renders a dimension's labels, with its emptyLabel for an empty value", () => {
        const model = autoDestroy(
                new CubeGridModel({
                    cube: createCube([...TRADES, trade(9, 'US', null, 'A', 1)]),
                    query: PIVOT_QUERY,
                    pivotConfig: {
                        dimensions: [
                            {
                                field: 'sector',
                                valueRenderer: v => v.toUpperCase(),
                                emptyLabel: '(No Sector)'
                            }
                        ]
                    }
                })
            ),
            groups = allGroups(model.gridModel.columns),
            empty = model.view.result.paths.find(it => it.isEmpty);

        expect(find(groups, {groupId: 'Tech'}).headerName).toBe('TECH');
        expect(find(groups, {groupId: empty.key}).headerName).toBe('(No Sector)');
    });

    it("puts a value's class on its header and every header and cell beneath it", () => {
        const model = createModel({
                query: SECTOR_BOOK_QUERY,
                pivotConfig: {
                    dimensions: [
                        {field: 'sector', valueClass: v => (v === 'Tech' ? 'is-tech' : null)},
                        {field: 'book', valueClass: 'is-book'}
                    ],
                    dimensionDefaults: {showSummary: true}
                }
            }),
            {gridModel} = model,
            groups = allGroups(gridModel.columns);

        expect(find(groups, {groupId: 'Tech'}).headerClass).toEqual(['is-tech']);
        expect(find(groups, {groupId: 'Tech>>A'}).headerClass).toEqual(['is-tech', 'is-book']);
        expect(find(groups, {groupId: 'Energy>>A'}).headerClass).toEqual(['is-book']);
        expect(gridModel.getColumn('Tech>>A>>sum').cellClass).toEqual(['is-tech', 'is-book']);
        expect(gridModel.getColumn('Tech>>A>>sum').headerClass).toEqual(['is-tech', 'is-book']);
        // Tech's summary sits inside its group, so takes its class too.
        expect(gridModel.getColumn('summary>>Tech>>sum').cellClass).toEqual([
            'xh-cube-grid__summary-cell',
            'is-tech'
        ]);
        expect(gridModel.getColumn('summary>>sum').cellClass).toEqual([
            'xh-cube-grid__summary-cell'
        ]);
    });

    it("adds a dimension's summaryClass to its summaries only", () => {
        const model = createModel({
                query: SECTOR_BOOK_QUERY,
                pivotConfig: {
                    dimensions: [{field: 'sector', summaryClass: 'is-row-summary'}],
                    dimensionDefaults: {showSummary: true}
                }
            }),
            {gridModel} = model,
            groups = allGroups(gridModel.columns);

        expect(gridModel.getColumn('summary>>sum').cellClass).toEqual([
            'xh-cube-grid__summary-cell',
            'is-row-summary'
        ]);
        expect(find(groups, {groupId: `${PIVOT_GROUP_ID}:summary`}).headerClass).toEqual([
            'xh-cube-grid__summary-header',
            'is-row-summary'
        ]);
        expect(gridModel.getColumn('summary>>Tech>>sum').cellClass).toEqual([
            'xh-cube-grid__summary-cell'
        ]);
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
                pivot: {dimensions: ['sector', 'book'], measures: ['sum']}
            },
            shared: ColumnSpec = {field: 'sum', headerName: 'Sum', exportName: 'Shared'},
            model = createModel({
                query,
                columns: [shared],
                pivotConfig: {
                    dimensions: [{field: 'sector', valueRenderer: v => v.toUpperCase()}],
                    dimensionDefaults: {showSummary: true},
                    measures: [{field: 'sum', column: shared}]
                }
            }),
            {gridModel} = model;

        expect(exportNameOf(gridModel, 'Tech>>A>>sum')).toBe('TECH › A › Sum');
        expect(exportNameOf(gridModel, 'summary>>Tech>>sum')).toBe('TECH › Total › Sum');
        expect(exportNameOf(gridModel, 'summary>>sum')).toBe('Total › Sum');
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
                pivotConfig: {measures: [{field: 'sum', column: shared}]}
            });

        expect(gridModel.getColumn('sum').filterable).toBe(true);
        expect(gridModel.getColumn('Tech>>sum').filterable).toBe(false);
    });
});

describe('summary column classes', () => {
    it('marks summary cells, headers and the summary group, leaving pivot cells unmarked', () => {
        const model = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {dimensionDefaults: {showSummary: true}}
            }),
            cols = model.gridModel.getLeafColumns(),
            summary = find(cols, {colId: 'summary>>sum'}),
            cell = find(cols, {colId: 'Tech>>sum'}),
            group = find(allGroups(model.gridModel.columns), {
                groupId: `${PIVOT_GROUP_ID}:summary`
            });

        expect(summary.cellClass).toEqual(['xh-cube-grid__summary-cell']);
        expect(summary.headerClass).toEqual(['xh-cube-grid__summary-header']);
        expect(group.headerClass).toEqual(['xh-cube-grid__summary-header']);
        expect(cell.cellClass).toBeFalsy();
        expect(cell.headerClass).toBeFalsy();
    });

    it('keeps an app class function on a summary column, adding the summary class', () => {
        const model = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {
                    dimensionDefaults: {showSummary: true},
                    measures: [
                        {
                            field: 'sum',
                            column: {cellClass: () => 'is-app', headerClass: () => 'is-app'}
                        }
                    ]
                }
            }),
            summary = find(model.gridModel.getLeafColumns(), {colId: 'summary>>sum'}),
            cellClass = summary.cellClass as (...args: any[]) => string[],
            headerClass = summary.headerClass as (...args: any[]) => string[];

        expect(cellClass()).toEqual(['xh-cube-grid__summary-cell', 'is-app']);
        expect(headerClass()).toEqual(['xh-cube-grid__summary-header', 'is-app']);
    });
});

describe('declined results', () => {
    it('empties the grid and drops the pivot region, then rebuilds when the query fits', () => {
        const pivot = {dimensions: ['sector'], measures: ['sum'], maxPivotPaths: 1},
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
describe('values outermost', () => {
    const VALUE_QUERY: QueryConfig = {
        ...PLAIN_QUERY,
        pivot: {dimensions: ['sector', 'book'], measures: ['sum', 'avg']}
    };

    it('roots a group per measure, with no region group, leaf paths heading their columns', () => {
        const model = createModel({
                query: VALUE_QUERY,
                pivotConfig: {
                    measuresOutermost: true,
                    measures: [{field: 'sum', column: {headerName: 'Qty'}}]
                }
            }),
            {gridModel} = model,
            roots = gridModel.columns.filter(it => it instanceof ColumnGroup) as ColumnGroup[];

        expect(roots.map(it => [it.groupId, it.headerName])).toEqual([
            ['sum::pivot', 'Qty'],
            ['avg::pivot', 'Avg']
        ]);
        expect(gridModel.getColumnGroup(PIVOT_GROUP_ID)).toBeFalsy();

        const tech = gridModel.getColumnGroup('sum::Tech');
        expect(tech.children.map(it => [groupIdOf(it), it.groupShowMode])).toEqual([
            ['Tech>>A>>sum', 'expanded'],
            ['Tech>>B>>sum', 'expanded'],
            ['measureSummary>>Tech>>sum', 'collapsed']
        ]);
        expect(gridModel.getColumn('Tech>>A>>sum').headerName).toBe('A');
        expect(gridModel.getColumn('measureSummary>>Tech>>sum').headerName).toBe('Total');
        expect(colIds(roots[0].children).at(-1)).toBe('measureSummary>>sum');
    });

    it('collapses each measure to its own row summary', () => {
        const model = createModel({query: VALUE_QUERY, pivotConfig: {measuresOutermost: true}}),
            {gridModel, pivotModel} = model;

        pivotModel.collapseAll();
        expect(gridModel.isColumnGroupExpanded('sum::pivot')).toBe(false);
        expect(gridModel.isColumnGroupExpanded('avg::pivot')).toBe(false);

        pivotModel.expandToLevel(1);
        expect(gridModel.isColumnGroupExpanded('sum::pivot')).toBe(true);
        expect(gridModel.isColumnGroupExpanded('sum::Tech')).toBe(false);
    });

    it('places a lone summary column on the side asked for, labelled by measure for export', () => {
        const {gridModel} = createModel({
                query: VALUE_QUERY,
                pivotConfig: {measuresOutermost: true, dimensionDefaults: {showSummary: 'right'}}
            }),
            tech = gridModel.getColumnGroup('sum::Tech'),
            summary = gridModel.getColumn('measureSummary>>Tech>>sum'),
            {exportName} = gridModel.getColumn('Tech>>A>>sum');

        expect(groupIdOf(tech.children.at(-1))).toBe('measureSummary>>Tech>>sum');
        expect(summary.groupShowMode).toBeNull();
        expect(
            isFunction(exportName)
                ? exportName({
                      column: gridModel.getColumn('Tech>>A>>sum'),
                      gridModel,
                      agParams: null
                  })
                : exportName
        ).toBe('Sum › Tech › A');
    });

    it('keeps cell colIds and their width when measuresOutermost changes', () => {
        const model = createModel({
                query: VALUE_QUERY,
                pivotConfig: {linkedSizing: false}
            }),
            {gridModel, pivotModel} = model;
        gridModel.updateColumnState([{colId: 'Tech>>A>>sum', width: 123}]);

        pivotModel.measuresOutermost = true;
        expect(gridModel.getColumnGroup('sum::Tech')).toBeTruthy();
        expect(gridModel.getStateForColumn('Tech>>A>>sum').width).toBe(123);

        pivotModel.measuresOutermost = false;
        expect(gridModel.getColumnGroup(PIVOT_GROUP_ID)).toBeTruthy();
        expect(gridModel.getStateForColumn('Tech>>A>>sum').width).toBe(123);
    });
});

describe('pivot column widths', () => {
    beforeAll(() => initTestAppAsync());

    const PIVOT_COLS = ['Energy>>sum', 'Tech>>sum', 'summary>>sum'],
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
        longLabels: PivotDimensionSpec[] = [
            {field: 'sector', valueRenderer: v => `${v} Long Label`.padEnd(21, '.')}
        ];

    it('gives every pivot column of a measure the widest autosized width', async () => {
        const model = createModel({
            query: PIVOT_QUERY,
            pivotConfig: {linkedSizing: {headerFitMaxWidth: 0}}
        });

        await autosize(model, [50, 70, 60]);
        expect(widthsOf(model)).toEqual([70, 70, 70]);
    });

    it('leaves each column its own width when turned off', async () => {
        const model = createModel({query: PIVOT_QUERY, pivotConfig: {linkedSizing: false}});

        await autosize(model, [50, 70, 60]);
        expect(widthsOf(model)).toEqual([50, 70, 60]);

        model.gridModel.updateColumnState([{colId: 'Tech>>sum', width: 90}]);
        expect(widthsOf(model)).toEqual([50, 90, 60]);
    });

    it('moves every pivot column of a measure with a manual resize', async () => {
        const model = createModel({
            query: PIVOT_QUERY,
            pivotConfig: {linkedSizing: {headerFitMaxWidth: 0}}
        });
        await autosize(model, [50, 70, 60]);

        model.gridModel.updateColumnState([{colId: 'Tech>>sum', width: 90}]);
        expect(widthsOf(model)).toEqual([90, 90, 90]);
    });

    it('widens for a label only up to headerFitMaxWidth, while data may go past it', async () => {
        measureByLength();
        const model = createModel({
            query: PIVOT_QUERY,
            pivotConfig: {dimensions: longLabels, linkedSizing: {headerFitMaxWidth: 120}}
        });

        await autosize(model, [50, 50, 50]);
        expect(widthsOf(model)).toEqual([120, 120, 120]);

        await autosize(model, [50, 150, 50]);
        expect(widthsOf(model)).toEqual([150, 150, 150]);
    });

    it('fits column headers as labels when values are outermost, up to headerFitMaxWidth', async () => {
        measureByLength();
        const colIds = ['Energy>>sum', 'Tech>>sum', 'measureSummary>>sum'],
            model = createModel({
                query: PIVOT_QUERY,
                pivotConfig: {
                    measuresOutermost: true,
                    dimensions: longLabels,
                    linkedSizing: {headerFitMaxWidth: 120}
                }
            }),
            {gridModel, pivotModel} = model;
        expect(gridModel.getColumn('Energy>>sum').autosizeIncludeHeader).toBe(false);

        await autosize(model, [50, 50, 50], colIds);
        expect(widthsOf(model, colIds)).toEqual([120, 120, 120]);

        await autosize(model, [50, 150, 50], colIds);
        expect(widthsOf(model, colIds)).toEqual([150, 150, 150]);

        // Off, columns size on their own, headers included.
        pivotModel.linkedSizing = false;
        expect(gridModel.getColumn('Energy>>sum').autosizeIncludeHeader).toBe(true);
    });

    it('widens only the measure a label spans when values are outermost', async () => {
        measureByLength();
        const colIds = [
                'Energy>>sum',
                'Tech>>sum',
                'measureSummary>>sum',
                'Energy>>avg',
                'Tech>>avg',
                'measureSummary>>avg'
            ],
            model = createModel({
                query: {
                    ...PIVOT_QUERY,
                    pivot: {dimensions: ['sector'], measures: ['sum', 'avg']}
                },
                pivotConfig: {
                    measuresOutermost: true,
                    // 'Average Of A Long Label' heads avg's root, wanting 236px over its two
                    // displayed columns - 68px more each.
                    measures: [{field: 'avg', column: {headerName: 'Average Of A Long Label'}}],
                    linkedSizing: {headerFitMaxWidth: 300}
                }
            });

        // Sum's widest label is 'Energy', wanting 65px.
        await autosize(model, [50, 50, 50, 50, 50, 50], colIds);
        expect(widthsOf(model, colIds)).toEqual([65, 65, 65, 118, 118, 118]);
    });

    it('autosizes a managed grid when the sizing or measuresOutermost changes', () => {
        const model = createModel({
                query: PIVOT_QUERY,
                gridConfig: {autosizeOptions: {mode: 'managed'}},
                pivotConfig: {linkedSizing: {headerFitMaxWidth: 140}}
            }),
            spy = vi.spyOn(model.gridModel, 'autosizeAsync');

        model.pivotModel.linkedSizing = {headerFitMaxWidth: 140};
        expect(spy).not.toHaveBeenCalled();

        model.pivotModel.linkedSizing = false;
        expect(spy).toHaveBeenCalledOnce();

        model.pivotModel.measuresOutermost = true;
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('shares a label shortfall evenly, so a narrow measure is not ballooned', async () => {
        measureByLength();
        const colIds = [
                'Energy>>sum',
                'Energy>>avg',
                'Tech>>sum',
                'Tech>>avg',
                'summary>>sum',
                'summary>>avg'
            ],
            model = createModel({
                query: {
                    ...PIVOT_QUERY,
                    pivot: {dimensions: ['sector'], measures: ['sum', 'avg']}
                },
                pivotConfig: {
                    // 'Energy Fixed Inc' wants 165px, capped at 140 - 30px more than its
                    // columns' data.
                    dimensions: [
                        {
                            field: 'sector',
                            valueRenderer: v => (v === 'Energy' ? 'Energy Fixed Inc' : v)
                        }
                    ]
                }
            });

        await autosize(model, [30, 80, 30, 80, 30, 80], colIds);
        expect(colIds.map(id => model.gridModel.getStateForColumn(id).width)).toEqual([
            45, 95, 45, 95, 45, 95
        ]);
    });

    it.each([true, false])(
        'fits a collapsed group label over its summary, and lets go on expand (collapsed label %s)',
        async showCollapsedLabel => {
            measureByLength();
            const model = createModel({
                    query: {
                        ...PLAIN_QUERY,
                        pivot: {dimensions: ['sector', 'book'], measures: ['sum']}
                    },
                    pivotConfig: {
                        // 'Tech Long Label' wants 155px, capped at 140.
                        dimensions: [
                            {
                                field: 'sector',
                                showCollapsedLabel,
                                valueRenderer: v => (v === 'Tech' ? 'Tech Long Label' : v)
                            }
                        ]
                    }
                }),
                {gridModel, pivotModel} = model,
                colIds = [...pivotModel.colIds];
            await autosize(
                model,
                colIds.map(() => 50),
                colIds
            );

            // Expanded, Tech's label spans its two book columns.
            expect(uniq(widthsOf(model, colIds))).toEqual([70]);

            // Collapsed, it spans only its summary column.
            gridModel.setColumnGroupExpanded('Tech', false);
            expect(uniq(widthsOf(model, colIds))).toEqual([140]);

            gridModel.setColumnGroupExpanded('Tech', true);
            expect(uniq(widthsOf(model, colIds))).toEqual([70]);
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
    pivot: {dimensions: ['sector'], measures: ['sum']}
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
