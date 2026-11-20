/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, type GridConfig, GridModel, type GridProps} from '@xh/hoist/cmp/grid';
import type {PlainObject} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {act, render, waitFor} from '@testing-library/react';
import {ModuleRegistry} from 'ag-grid-community';
import {CellSelectionModule, ClipboardModule, RowGroupingModule} from 'ag-grid-enterprise';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Cell range selection on GridModel (#4920). Ranges are spans of row index in ag-Grid - these
 * tests pin down how Hoist maps them to records, how the selected record follows the newest
 * range, and when ranges are cleared so they never silently cover different records.
 *
 * Most gestures are driven through ag-Grid's range API. A plain click is a cleared selection plus
 * one range, a Ctrl+click adds a range. ag-Grid finds the cell under a drag from the event target,
 * not from layout, so a mouse drag can also be dispatched in jsdom.
 */
describe('GridCellSelectionModel', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        installAgGridForTests();
        ModuleRegistry.registerModules([CellSelectionModule, ClipboardModule, RowGroupingModule]);
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

        it('reports whether a cell is in any range', async () => {
            const {gridModel} = await renderGridAsync(),
                model = gridModel.cellSelectionModel,
                rec = (id: number) => gridModel.store.getById(id);

            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 0, columns: ['name']});
            await ctrlClickAsync(gridModel, {rowStartIndex: 2, rowEndIndex: 2, columns: ['qty']});

            expect(model.isCellSelected(rec(1), 'name')).toBe(true);
            expect(model.isCellSelected(rec(3), 'qty')).toBe(true);
            expect(model.isCellSelected(rec(1), 'qty')).toBe(false);
            expect(model.isCellSelected(rec(2), 'name')).toBe(false);
        });

        // ag-Grid reports every cell crossed during a drag. Observers of `ranges`, such as a
        // selection summary, run once at the end instead.
        it('holds still during a drag, and updates when the drag ends', async () => {
            const {gridModel, container} = await renderGridAsync(),
                model = gridModel.cellSelectionModel,
                ids = () => model.ranges.map(r => r.records.map(it => it.id));

            await dragAsync(container, 'mousedown', 0, 'name', 0);
            await dragAsync(container, 'mousemove', 0, 'name', 10);
            await dragAsync(container, 'mousemove', 1, 'name', 20);
            await dragAsync(container, 'mousemove', 2, 'name', 30);

            expect(gridModel.agApi.getCellRanges()[0].endRow.rowIndex).toBeGreaterThan(0);
            expect(ids()).toEqual([[1]]);
            expect(gridModel.selModel.selectedId).toBe(1);

            await dragAsync(container, 'mouseup', 2, 'name', 30);
            await waitFor(() => expect(ids()[0].length).toBeGreaterThan(1));
            expect(gridModel.selModel.selectedId).toBe(1);
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

    // Grouped rows - 0: group A, 1: Alpha, 2: Beta, 3: group B, 4: Gamma.
    describe('group rows', () => {
        it('are left out of the records, and the selected record follows the start cell', async () => {
            const {gridModel} = await renderGroupedGridAsync(),
                model = gridModel.cellSelectionModel;

            await clickAsync(gridModel, {rowStartIndex: 2, rowEndIndex: 4, columns: ['name']});

            const [range] = model.ranges;
            expect(range.records.map(it => it.id)).toEqual([2, 3]);
            expect(range.startRecord.id).toBe(2);
            expect(gridModel.selModel.selectedId).toBe(2);
        });

        it('select no record when the newest range starts on one', async () => {
            const {gridModel} = await renderGroupedGridAsync(),
                model = gridModel.cellSelectionModel;
            await clickAsync(gridModel, {rowStartIndex: 1, rowEndIndex: 1, columns: ['name']});
            expect(gridModel.selModel.selectedId).toBe(1);

            await clickAsync(gridModel, {rowStartIndex: 3, rowEndIndex: 4, columns: ['name']});

            const [range] = model.ranges;
            expect(range.startRecord).toBeNull();
            expect(range.startColumn.colId).toBe('name');
            expect(range.records.map(it => it.id)).toEqual([3]);
            expect(gridModel.selModel.isEmpty).toBe(true);
            expect(model.isEmpty).toBe(false);
        });

        it('copy as a line of empty cells, keeping the lines aligned with the grid', async () => {
            let copied: string = null;
            const {gridModel} = await renderGroupedGridAsync({
                agOptions: {sendToClipboard: ({data}) => (copied = data)}
            });
            await clickAsync(gridModel, {
                rowStartIndex: 2,
                rowEndIndex: 4,
                columns: ['name', 'qty']
            });

            act(() => gridModel.agApi.copySelectedRangeToClipboard());

            expect(copied.split('\r\n')).toEqual(['Beta\t2', '\t', 'Gamma\t3']);
        });

        it('are skipped when Delete clears a range', async () => {
            const {gridModel, container} = await renderGroupedGridAsync(),
                {store} = gridModel;
            await clickAsync(gridModel, {rowStartIndex: 0, rowEndIndex: 4, columns: ['qty']});

            const cell = container.querySelector('.ag-row[row-id="ag_1"] .ag-cell') as HTMLElement;
            act(() => {
                cell.dispatchEvent(new KeyboardEvent('keydown', {key: 'Delete', bubbles: true}));
            });

            await waitFor(() => expect(store.modifiedRecords.map(it => it.id)).toEqual([1, 2, 3]));
            expect(store.records.map(it => it.data.qty)).toEqual([null, null, null]);
        });

        // Not held in place as the sort will be - see the README.
        it('clear the ranges when an edit moves a record to another group', async () => {
            const {gridModel} = await renderGroupedGridAsync(),
                model = gridModel.cellSelectionModel;
            await clickAsync(gridModel, {rowStartIndex: 1, rowEndIndex: 2, columns: ['qty']});

            act(() => gridModel.store.modifyRecords({id: 2, grp: 'B'}));

            await waitFor(() => expect(model.isEmpty).toBe(true));
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

// One step of a mouse drag over the cell at a row index and column. ag-Grid starts the drag once
// the mouse has moved a few pixels, so each step moves it further - pass a growing `offset`.
async function dragAsync(
    container: HTMLElement,
    type: 'mousedown' | 'mousemove' | 'mouseup',
    rowIndex: number,
    colId: string,
    offset: number
) {
    const cell = container.querySelector(`.ag-row[row-index="${rowIndex}"] [col-id="${colId}"]`);
    act(() => {
        cell.dispatchEvent(
            new MouseEvent(type, {bubbles: true, button: 0, clientX: offset, clientY: offset})
        );
    });
    // ag-Grid delivers `cellSelectionChanged` asynchronously.
    await wait(20);
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

async function renderGridAsync(
    config: GridConfig = {},
    data: PlainObject[] = DATA,
    props: GridProps = {}
) {
    const gridModel = new GridModel({
        columns: [{field: 'name'}, {field: 'qty'}],
        cellSelection: true,
        ...config
    });
    onTestFinished(() => gridModel.destroy());
    gridModel.loadData(data);

    const {container} = render(grid({model: gridModel, width: 600, height: 400, ...props}));
    await waitFor(() => expect(gridModel.agApi?.getDisplayedRowCount()).toBeGreaterThan(0));
    const rowCount = gridModel.agApi.getDisplayedRowCount();
    await waitFor(() => expect(container.querySelectorAll('.ag-row')).toHaveLength(rowCount));
    if (gridModel.cellSelectionModel) {
        await waitFor(() => expect(gridModel.cellSelectionModel.isEnabled).toBe(true));
    }
    return {gridModel, container};
}

// Grouped by `grp`, with editable `qty` - see the 'group rows' tests for the row layout.
function renderGroupedGridAsync(props: GridProps = {}) {
    return renderGridAsync(
        {
            columns: [
                {field: 'grp', hidden: true},
                {field: 'name'},
                {field: 'qty', editable: true}
            ],
            groupBy: 'grp'
        },
        [
            {id: 1, grp: 'A', name: 'Alpha', qty: 1},
            {id: 2, grp: 'A', name: 'Beta', qty: 2},
            {id: 3, grp: 'B', name: 'Gamma', qty: 3}
        ],
        props
    );
}
