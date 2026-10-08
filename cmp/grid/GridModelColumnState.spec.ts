/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type ColumnOrGroupSpec, type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * GridModel column state - the order, visibility, width and pinning of columns, and the
 * expand/collapse state of column groups. Users customize this state via the column chooser and
 * header drags, and it is saved to prefs and views that outlive the release that wrote them. A
 * merge bug here silently loses a user's layout or resurrects columns they removed.
 */
describe('GridModel', () => {
    beforeAll(() => initTestAppAsync());

    describe('setColumnState', () => {
        it('drops removed columns and inserts new ones at their configured index', () => {
            // Typical of state saved under an older release of the app.
            const gridModel = createGridModel();

            gridModel.setColumnState([
                {colId: 'pnl', width: 100, hidden: false},
                {colId: 'removedCol', width: 100, hidden: false},
                {colId: 'name', width: 100, hidden: false}
            ]);
            expect(colIds(gridModel)).toEqual(['pnl', 'region', 'name', 'actions']);
        });

        it('hides new columns if requested, except those the user could not restore', () => {
            // Added in 87.0.0 (#4537), so a release does not add columns to curated views.
            const gridModel = createGridModel({
                columns: [
                    {field: 'name'},
                    {field: 'region'},
                    {field: 'trader', hideable: false},
                    {field: 'internalId', excludeFromChooser: true}
                ]
            });

            gridModel.setColumnState([{colId: 'name', width: 100, hidden: false}], {
                hideNewColumns: true
            });
            expect(visibleColIds(gridModel)).toEqual(['name', 'trader', 'internalId']);
        });
    });

    describe('updateColumnState', () => {
        it('applies width, visibility and pinning changes without reordering', () => {
            const gridModel = createGridModel();

            gridModel.updateColumnState([
                {colId: 'pnl', width: 150, pinned: 'left'},
                {colId: 'name', hidden: true}
            ]);

            expect(colIds(gridModel)).toEqual(['name', 'region', 'pnl', 'actions']);
            expect(gridModel.getStateForColumn('pnl')).toMatchObject({width: 150, pinned: 'left'});
            expect(gridModel.isColumnVisible('name')).toBe(false);
        });

        it('reorders columns when given a change for every leaf column', () => {
            const gridModel = createGridModel();

            gridModel.updateColumnState([
                {colId: 'actions'},
                {colId: 'pnl'},
                {colId: 'name'},
                {colId: 'region'}
            ]);
            expect(colIds(gridModel)).toEqual(['actions', 'pnl', 'name', 'region']);
        });

        it('keeps the current state instance when nothing changes', () => {
            // The Grid component re-applies state to ag-Grid whenever this reference changes.
            const gridModel = createGridModel(),
                {columnState} = gridModel;

            gridModel.updateColumnState([{colId: 'name', width: 120, hidden: false}]);
            expect(gridModel.columnState).toBe(columnState);
        });

        it('throws on an unknown column', () => {
            const gridModel = createGridModel(),
                update = () => gridModel.updateColumnState([{colId: 'removedCol', hidden: true}]);

            expect(update).toThrow('Invalid columns');
        });
    });

    describe('noteAgColumnStateChanged', () => {
        it("syncs ag-Grid's column state, ignoring its auto group column", () => {
            // Grouped and tree grids report it alongside the leaf columns - it must not block the
            // full-list reorder below.
            const gridModel = createGridModel();

            gridModel.noteAgColumnStateChanged([
                {colId: 'ag-Grid-AutoColumn', width: 200, hide: false, pinned: 'left'},
                {colId: 'pnl', width: 140, hide: false, pinned: true},
                {colId: 'name', width: 120, hide: false, pinned: null},
                {colId: 'region', width: 300, hide: false, pinned: null},
                {colId: 'actions', width: 40, hide: true, pinned: null}
            ]);

            expect(colIds(gridModel)).toEqual(['pnl', 'name', 'region', 'actions']);
            expect(gridModel.getColumnPinned('pnl')).toBe('left');
            expect(gridModel.getStateForColumn('pnl').width).toBe(140);
            expect(gridModel.isColumnVisible('actions')).toBe(false);

            // Flex columns size to fit - ag-Grid's computed width is not state.
            expect(gridModel.getStateForColumn('region').width).toBeNull();
        });
    });

    describe('isColumnVisible', () => {
        it('reads visibility from column state, not the Column config', () => {
            const gridModel = createGridModel({
                columns: [{field: 'name'}, {field: 'region', hidden: true}]
            });

            gridModel.hideColumn('name');
            gridModel.showColumn('region');

            expect(gridModel.isColumnVisible('name')).toBe(false);
            expect(gridModel.isColumnVisible('region')).toBe(true);
            expect(gridModel.getVisibleLeafColumns().map(it => it.colId)).toEqual(['region']);
            expect(gridModel.getColumn('name').hidden).toBe(false);
        });
    });

    describe('persistableColumnState', () => {
        it('stores only the id and hidden flag of hidden columns', () => {
            const gridModel = createGridModel();

            gridModel.updateColumnState([{colId: 'pnl', width: 150, pinned: 'left', hidden: true}]);
            expect(gridModel.persistableColumnState[2]).toEqual({colId: 'pnl', hidden: true});
        });

        it('includes widths set in code, unless autosize mode is managed', () => {
            // Fixed in 76.0.0 (#4102) - without default widths, restoring a view left stale widths.
            const gridModel = createGridModel();
            expect(gridModel.persistableColumnState[0]).toEqual({
                colId: 'name',
                width: 120,
                hidden: false,
                pinned: null,
                manuallySized: true
            });

            const managedModel = createGridModel({autosizeOptions: {mode: 'managed'}});
            expect(managedModel.persistableColumnState[0]).toEqual({
                colId: 'name',
                hidden: false,
                pinned: null,
                manuallySized: false
            });

            managedModel.noteColumnManuallySized('name', 180);
            expect(managedModel.persistableColumnState[0]).toMatchObject({
                width: 180,
                manuallySized: true
            });
        });

        it('omits widths of columns that are not resizable or are flexed', () => {
            const gridModel = createGridModel(),
                stateById = new Map(gridModel.persistableColumnState.map(it => [it.colId, it]));

            expect(stateById.get('actions')).not.toHaveProperty('width');
            expect(stateById.get('region')).not.toHaveProperty('width');
        });
    });

    describe('column groups', () => {
        it('defaults from the groups configured, outermost first', () => {
            const gridModel = createGridModel({columns: groupedColumns()});

            expect(gridModel.columnGroupState).toEqual([
                {groupId: 'q1', expanded: false},
                {groupId: 'h2', expanded: true},
                {groupId: 'q3', expanded: true}
            ]);
        });

        it('restores state for current groups only, defaulting the rest', () => {
            const gridModel = createGridModel({columns: groupedColumns()});

            gridModel.setColumnGroupState([
                {groupId: 'q3', expanded: false},
                {groupId: 'removedGroup', expanded: true},
                {groupId: 'q1', expanded: true}
            ]);
            expect(gridModel.columnGroupState).toEqual([
                {groupId: 'q1', expanded: true},
                {groupId: 'h2', expanded: true},
                {groupId: 'q3', expanded: false}
            ]);

            gridModel.setColumnGroupState([]);
            expect(gridModel.isColumnGroupExpanded('q1')).toBe(false);
            expect(gridModel.isColumnGroupExpanded('q3')).toBe(true);
        });

        it("applies ag-Grid's group changes, ignoring groups this model does not define", () => {
            // ag-Grid also reports the padding groups it creates to balance header rows.
            const gridModel = createGridModel({columns: groupedColumns()});

            gridModel.noteAgColumnGroupStateChanged([
                {groupId: 'q1', open: true},
                {groupId: 'agPaddingGroup', open: false}
            ]);
            const {columnGroupState} = gridModel;
            expect(columnGroupState).toEqual([
                {groupId: 'q1', expanded: true},
                {groupId: 'h2', expanded: true},
                {groupId: 'q3', expanded: true}
            ]);

            gridModel.noteAgColumnGroupStateChanged([{groupId: 'q1', open: true}]);
            expect(gridModel.columnGroupState).toBe(columnGroupState);
        });

        it('hides and shows every leaf column of a group', () => {
            const gridModel = createGridModel({columns: groupedColumns()});

            gridModel.hideColumnGroup('h2');
            expect(visibleColIds(gridModel)).toEqual(['name', 'jan', 'q1Total']);

            gridModel.showColumnGroup('h2');
            expect(visibleColIds(gridModel)).toEqual([
                'name',
                'jan',
                'q1Total',
                'jul',
                'q3Total',
                'h2Total'
            ]);
        });
    });

    describe('setColumns', () => {
        it('rejects an id shared by a column and a column group', () => {
            const gridModel = createGridModel(),
                columns: ColumnOrGroupSpec[] = [
                    {field: 'q1'},
                    {groupId: 'q1', children: [{field: 'jan'}]}
                ];

            expect(() => gridModel.setColumns(columns)).toThrow('Non-unique ids: [q1]');
            expect(gridModel.getLeafColumnIds()).toEqual(['name', 'region', 'pnl', 'actions']);
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
            {field: 'name', width: 120},
            {field: 'region', flex: 1},
            {field: 'pnl', width: 100},
            {colId: 'actions', width: 40, resizable: false}
        ],
        ...config
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

// Expandable groups, one nested within another.
function groupedColumns(): ColumnOrGroupSpec[] {
    return [
        {field: 'name'},
        {
            groupId: 'q1',
            collapsed: true,
            children: [
                {field: 'jan', groupShowMode: 'expanded'},
                {field: 'q1Total', groupShowMode: 'collapsed'}
            ]
        },
        {
            groupId: 'h2',
            children: [
                {
                    groupId: 'q3',
                    groupShowMode: 'expanded',
                    children: [
                        {field: 'jul', groupShowMode: 'expanded'},
                        {field: 'q3Total', groupShowMode: 'collapsed'}
                    ]
                },
                {field: 'h2Total', groupShowMode: 'collapsed'}
            ]
        }
    ];
}

function colIds(gridModel: GridModel): string[] {
    return gridModel.columnState.map(it => it.colId);
}

function visibleColIds(gridModel: GridModel): string[] {
    return gridModel.getVisibleLeafColumns().map(it => it.colId);
}
