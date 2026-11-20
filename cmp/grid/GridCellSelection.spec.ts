/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {render, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Cell range selection on GridModel (#4920) is opt-in, and needs ag-Grid Enterprise. These tests
 * pin down that grids without the flag are unchanged, and that a grid with it stays off where it
 * is not supported.
 *
 * Range behavior itself needs ag-Grid Enterprise's `CellSelectionModule`. hoist-react depends only
 * on ag-Grid Community, so that behavior is not covered here.
 */
describe('GridCellSelectionModel', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        installAgGridForTests();
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

    it("stays off, with a warning, without ag-Grid's CellSelectionModule", async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        onTestFinished(() => warn.mockRestore());

        const {gridModel, container} = await renderGridAsync({cellSelection: true}),
            {agApi, cellSelectionModel} = gridModel;
        await waitFor(() =>
            expect(warn.mock.calls.flat().join(' ')).toContain('CellSelectionModule')
        );

        expect(cellSelectionModel.isEnabled).toBe(false);
        expect(agApi.getGridOption('cellSelection')).toBeUndefined();
        expect(agApi.getGridOption('rowSelection')).toMatchObject({
            enableClickSelection: true,
            copySelectedRows: true
        });
        expect(container.querySelector('.xh-grid--cell-selection')).toBeNull();
    });
});

//------------------------
// Helpers
//------------------------
async function renderGridAsync(config: GridConfig) {
    const gridModel = new GridModel({columns: [{field: 'name'}, {field: 'qty'}], ...config});
    onTestFinished(() => gridModel.destroy());
    gridModel.loadData([
        {id: 1, name: 'Alpha', qty: 1},
        {id: 2, name: 'Beta', qty: 2}
    ]);

    const {container} = render(grid({model: gridModel, width: 600, height: 400}));
    await waitFor(() => expect(container.querySelectorAll('.ag-row')).toHaveLength(2));
    return {gridModel, container};
}
