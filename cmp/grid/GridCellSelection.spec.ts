/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import type {PlainObject} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {act, render, waitFor} from '@testing-library/react';
import {ModuleRegistry} from 'ag-grid-community';
import {CellSelectionModule} from 'ag-grid-enterprise';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Cell range selection on GridModel (#4920). Ranges are spans of row index in ag-Grid - these
 * tests pin down how Hoist maps them to records, how the selected record follows the newest
 * range, and when ranges are cleared so they never silently cover different records.
 *
 * Gestures are driven through ag-Grid's range API: jsdom has no layout, so a mouse drag cannot
 * be simulated. A plain click is a cleared selection plus one range, a Ctrl+click adds a range.
 */
describe('GridCellSelectionModel', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        installAgGridForTests();
        ModuleRegistry.registerModules([CellSelectionModule]);
    });

    describe('setup', () => {
        it('turns on ag-Grid cell selection, with row click selection and row copy off', async () => {
            const {gridModel} = await renderGridAsync(),
                {agApi} = gridModel;

            expect(gridModel.cellSelectionModel.isEnabled).toBe(true);
            expect(agApi.getGridOption('cellSelection')).toBe(true);
            expect(agApi.getGridOption('rowSelection')).toMatchObject({
                mode: 'singleRow',
                enableClickSelection: false,
                copySelectedRows: false
            });
        });

        it('leaves grids without the flag unchanged', async () => {
            const {gridModel} = await renderGridAsync({cellSelection: false}),
                {agApi} = gridModel;

            expect(gridModel.cellSelectionModel).toBeNull();
            expect(agApi.getGridOption('cellSelection')).toBeUndefined();
            expect(agApi.getGridOption('rowSelection')).toMatchObject({
                enableClickSelection: true,
                copySelectedRows: true
            });
        });

        it("is not supported with selModel mode 'multiple'", () => {
            const gridModel = new GridModel({
                columns: [{field: 'name'}],
                selModel: 'multiple',
                cellSelection: true
            });
            onTestFinished(() => gridModel.destroy());
            expect(gridModel.cellSelectionModel).toBeNull();
        });
    });

    describe('ranges', () => {
        it('exposes each range as its records and columns, in display order', async () => {
            const {gridModel} = await renderGridAsync(),
                {cellSelectionModel: model} = gridModel;
            expect(model.isEmpty).toBe(true);

            // Dragged upward - start row below end row.
            await clickAsync(gridModel, {
                rowStartIndex: 2,
                rowEndIndex: 1,
                columns: ['name', 'qty']
            });

            const [range] = model.ranges;
            expect(range.records.map(it => it.id)).toEqual([2, 3]);
            expect(range.columns.map(it => it.colId)).toEqual(['name', 'qty']);
            expect(range.startRecord.id).toBe(3);
            expect(model.isEmpty).toBe(false);
            expect(model.cells.map(({record, column}) => `${record.id}:${column.colId}`)).toEqual([
                '2:name',
                '2:qty',
                '3:name',
                '3:qty'
            ]);
        });

        it('lists a cell covered by overlapping ranges once', async () => {
            const {gridModel} = await renderGridAsync(),
                model = gridModel.cellSelectionModel;

            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 1, columns: ['qty']});
            await ctrlClickAsync(gridModel, {rowStartIndex: 1, rowEndIndex: 2, columns: ['qty']});

            expect(model.ranges).toHaveLength(2);
            expect(model.cells.map(({record}) => record.id)).toEqual([1, 2, 3]);
        });

        it('includes docked summary rows', async () => {
            const {gridModel} = await renderGridAsync({showSummary: 'bottom'}),
                model = gridModel.cellSelectionModel;
            gridModel.loadData(DATA, {id: 'sum', qty: 6});
            await waitFor(() => expect(gridModel.agApi.getPinnedBottomRowCount()).toBe(1));

            await clickAsync(gridModel, {
                rowStartIndex: 2,
                rowEndIndex: 0,
                rowEndPinned: 'bottom',
                columns: ['qty']
            });

            expect(model.ranges[0].records.map(it => it.id)).toEqual([3, 'sum']);
        });

        it('clears from the model and from ag-Grid', async () => {
            const {gridModel} = await renderGridAsync(),
                model = gridModel.cellSelectionModel;
            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 1, columns: ['name']});

            act(() => model.clear());

            expect(model.isEmpty).toBe(true);
            expect(gridModel.agApi.getCellRanges()).toEqual([]);
        });
    });

    describe('selected record', () => {
        it('follows the start cell of the newest range', async () => {
            const {gridModel} = await renderGridAsync(),
                {selModel} = gridModel;

            await clickAsync(gridModel, {rowStartIndex: 1, rowEndIndex: 2, columns: ['name']});
            expect(selModel.selectedId).toBe(2);

            // Ctrl+click adds a range, and moves the selected record to it.
            await ctrlClickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 0, columns: ['qty']});
            expect(selModel.selectedId).toBe(1);
            expect(gridModel.cellSelectionModel.ranges).toHaveLength(2);
        });

        it('stays on the start row as the range is extended', async () => {
            const {gridModel} = await renderGridAsync();

            await clickAsync(gridModel, {rowStartIndex: 1, rowEndIndex: 1, columns: ['name']});
            await extendAsync(gridModel, {
                rowStartIndex: 1,
                rowEndIndex: 2,
                columns: ['name', 'qty']
            });

            expect(gridModel.selModel.selectedId).toBe(2);
            expect(gridModel.cellSelectionModel.ranges[0].records).toHaveLength(2);
        });

        it('clears when the newest range starts in a docked summary row', async () => {
            const {gridModel} = await renderGridAsync({showSummary: 'top'});
            gridModel.loadData(DATA, {id: 'sum', qty: 6});
            await waitFor(() => expect(gridModel.agApi.getPinnedTopRowCount()).toBe(1));

            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 0, columns: ['name']});
            expect(gridModel.selModel.selectedId).toBe(1);

            await clickAsync(gridModel, {
                rowStartIndex: 0,
                rowStartPinned: 'top',
                rowEndIndex: 0,
                rowEndPinned: 'top',
                columns: ['qty']
            });
            expect(gridModel.selModel.isEmpty).toBe(true);
            expect(gridModel.cellSelectionModel.isEmpty).toBe(false);
        });

        it('stays put when all cells are selected with Ctrl+A', async () => {
            const {gridModel, container} = await renderGridAsync();
            await clickAsync(gridModel, {rowStartIndex: 2, rowEndIndex: 2, columns: ['name']});

            const frame = container.querySelector('.xh-grid');
            await changeRangesAsync(gridModel, () => {
                frame.dispatchEvent(
                    new KeyboardEvent('keydown', {key: 'a', ctrlKey: true, bubbles: true})
                );
                // Stands in for ag-Grid's own select all, which it runs as the key goes by.
                selectAll(gridModel);
            });

            expect(gridModel.cellSelectionModel.ranges[0].records).toHaveLength(3);
            expect(gridModel.selModel.selectedId).toBe(3);
        });

        it('clears the ranges when the selection changes for another reason', async () => {
            const {gridModel} = await renderGridAsync(),
                model = gridModel.cellSelectionModel;
            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 1, columns: ['name']});

            act(() => gridModel.selModel.select(1));
            expect(model.isEmpty).toBe(false);

            act(() => gridModel.selModel.select(3));
            expect(model.isEmpty).toBe(true);
            expect(gridModel.agApi.getCellRanges()).toEqual([]);
            expect(gridModel.selModel.selectedId).toBe(3);
        });

        it('keeps the ranges on a right-click inside them, and moves to a right-click outside', async () => {
            const {gridModel} = await renderGridAsync({contextMenu: ['copy']}),
                {agApi, cellSelectionModel, selModel} = gridModel,
                getContextMenuItems = agApi.getGridOption('getContextMenuItems'),
                rightClick = (rowIndex: number, colId: string) =>
                    act(() => {
                        getContextMenuItems({
                            node: agApi.getDisplayedRowAtIndex(rowIndex),
                            column: agApi.getColumn(colId)
                        } as any);
                    });
            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 1, columns: ['name']});

            rightClick(1, 'name');
            expect(selModel.selectedId).toBe(1);
            expect(cellSelectionModel.ranges).toHaveLength(1);

            rightClick(1, 'qty');
            expect(selModel.selectedId).toBe(2);
            expect(cellSelectionModel.isEmpty).toBe(true);
        });

        it('stays put when the ranges are cleared', async () => {
            const {gridModel} = await renderGridAsync();
            await clickAsync(gridModel, {rowStartIndex: 1, rowEndIndex: 2, columns: ['name']});

            act(() => gridModel.setSortBy('qty|desc'));

            expect(gridModel.cellSelectionModel.isEmpty).toBe(true);
            expect(gridModel.selModel.selectedId).toBe(2);
        });
    });

    describe('when rows change', () => {
        it.each([
            ['the sort changes', (m: GridModel) => m.setSortBy('qty|desc')],
            [
                'the filter changes',
                (m: GridModel) => m.store.setFilter({field: 'qty', op: '>', value: 0})
            ],
            ['data is loaded', (m: GridModel) => m.loadData(DATA)],
            ['groupBy changes', (m: GridModel) => m.setGroupBy('name')]
        ])('clears the ranges when %s', async (_, change) => {
            const {gridModel} = await renderGridAsync();
            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 1, columns: ['name']});

            act(() => change(gridModel));

            expect(gridModel.cellSelectionModel.isEmpty).toBe(true);
        });

        it('clears the ranges when rows are added or removed', async () => {
            const {gridModel} = await renderGridAsync(),
                model = gridModel.cellSelectionModel;
            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 1, columns: ['name']});

            act(() => gridModel.updateData({add: [{id: 4, name: 'Delta', qty: 4}]}));

            await waitFor(() => expect(model.isEmpty).toBe(true));
        });

        it('keeps the ranges through in-place value updates, with the latest records', async () => {
            const {gridModel} = await renderGridAsync(),
                model = gridModel.cellSelectionModel;
            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 1, columns: ['qty']});

            act(() => gridModel.updateData({update: [{id: 2, name: 'Beta', qty: 20}]}));

            await waitFor(() => expect(model.ranges[0].records[1].data.qty).toBe(20));
            expect(model.ranges[0].records.map(it => it.id)).toEqual([1, 2]);
        });

        it('clears the ranges when a value update re-sorts rows', async () => {
            const {gridModel} = await renderGridAsync({
                    sortBy: 'qty',
                    experimental: {deferredSortFactor: 0}
                }),
                model = gridModel.cellSelectionModel;
            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 1, columns: ['qty']});

            act(() => gridModel.updateData({update: [{id: 1, name: 'Alpha', qty: 10}]}));

            await waitFor(() => expect(model.isEmpty).toBe(true));
        });

        // Value updates apply at once with row order held stale, then re-sort in a deferred flush.
        it('clears the ranges when a deferred re-sort moves rows', async () => {
            const {gridModel} = await renderGridAsync({sortBy: 'qty'}),
                model = gridModel.cellSelectionModel;
            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 1, columns: ['qty']});

            act(() => gridModel.updateData({update: [{id: 1, name: 'Alpha', qty: 10}]}));

            await waitFor(() => expect(model.isEmpty).toBe(true), {timeout: 5000});
        });
    });

    // Matches Excel, where Delete clears every selected cell. ag-Grid does the clearing, through
    // each Column's editable check and setValueFn, so edits land in the Store as usual.
    describe('Delete key', () => {
        it('clears every editable cell in the ranges, as Store modifications', async () => {
            const {gridModel, container} = await renderGridAsync(
                    {
                        columns: [
                            {field: 'name'},
                            {field: 'qty', editable: true},
                            {field: 'price', editable: ({record}) => record.id !== 2}
                        ]
                    },
                    [
                        {id: 1, name: 'Alpha', qty: 1, price: 10},
                        {id: 2, name: 'Beta', qty: 2, price: 20},
                        {id: 3, name: 'Gamma', qty: 3, price: 30}
                    ]
                ),
                {store} = gridModel,
                values = (id: number) => {
                    const {name, qty, price} = store.getById(id).data;
                    return [name, qty, price];
                };
            await clickAsync(gridModel, {
                rowStartIndex: 0,
                rowEndIndex: 1,
                columns: ['name', 'qty', 'price']
            });

            const cell = container.querySelector('.ag-row[row-id="ag_1"] .ag-cell') as HTMLElement;
            act(() => {
                cell.dispatchEvent(new KeyboardEvent('keydown', {key: 'Delete', bubbles: true}));
            });

            await waitFor(() => expect(values(1)).toEqual(['Alpha', null, null]));
            expect(values(2)).toEqual(['Beta', null, 20]);
            expect(values(3)).toEqual(['Gamma', 3, 30]);
            expect(store.modifiedRecords.map(it => it.id)).toEqual([1, 2]);
        });
    });
});

//------------------------
// Helpers
//------------------------
const DATA = [
    {id: 1, name: 'Alpha', qty: 1},
    {id: 2, name: 'Beta', qty: 2},
    {id: 3, name: 'Gamma', qty: 3}
];

type RangeSpec = Parameters<GridModel['agApi']['addCellRange']>[0];

// A plain click or arrow key: ag-Grid clears the ranges and starts one.
async function clickAsync(gridModel: GridModel, range: RangeSpec) {
    await changeRangesAsync(gridModel, () => {
        gridModel.agApi.clearCellSelection();
        gridModel.agApi.addCellRange(range);
    });
}

// Ctrl/Cmd+click: ag-Grid appends a range.
async function ctrlClickAsync(gridModel: GridModel, range: RangeSpec) {
    await changeRangesAsync(gridModel, () => gridModel.agApi.addCellRange(range));
}

// Drag or Shift+click: ag-Grid moves the end of the newest range, keeping its start.
async function extendAsync(gridModel: GridModel, range: RangeSpec) {
    await clickAsync(gridModel, range);
}

// ag-Grid delivers `cellSelectionChanged` asynchronously - wait for the model to see the ranges.
async function changeRangesAsync(gridModel: GridModel, fn: () => void) {
    act(fn);
    const expected = gridModel.agApi.getCellRanges().length;
    await waitFor(() => expect(gridModel.cellSelectionModel.ranges).toHaveLength(expected));
}

function selectAll(gridModel: GridModel) {
    const {agApi} = gridModel;
    agApi.clearCellSelection();
    agApi.addCellRange({
        rowStartIndex: 0,
        rowEndIndex: agApi.getDisplayedRowCount() - 1,
        columns: ['name', 'qty']
    });
}

async function renderGridAsync(config: GridConfig = {}, data: PlainObject[] = DATA) {
    const gridModel = new GridModel({
        columns: [{field: 'name'}, {field: 'qty'}],
        cellSelection: true,
        ...config
    });
    onTestFinished(() => gridModel.destroy());
    gridModel.loadData(data);

    const {container} = render(grid({model: gridModel, width: 600, height: 400}));
    await waitFor(() => expect(container.querySelectorAll('.ag-row')).toHaveLength(data.length));
    if (gridModel.cellSelectionModel) {
        await waitFor(() => expect(gridModel.cellSelectionModel.isEnabled).toBe(true));
    }
    return {gridModel, container};
}
