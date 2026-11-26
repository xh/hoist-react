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

describe('Grid group row options', () => {
    beforeAll(async () => {
        installAgGridForTests();
        await initTestAppAsync();
    });

    it('shows or hides group row counts as showGroupRowCounts changes', async () => {
        const {gridModel} = await renderGridAsync(),
            {agApi} = gridModel,
            params = () => agApi.getGridOption('groupRowRendererParams');
        expect(params().suppressCount).toBe(false);
        const redrawRows = vi.spyOn(agApi, 'redrawRows');

        gridModel.showGroupRowCounts = false;

        await waitFor(() => expect(params().suppressCount).toBe(true));
        expect(redrawRows).toHaveBeenCalled();

        gridModel.showGroupRowCounts = true;
        await waitFor(() => expect(params().suppressCount).toBe(false));
    });

    // ag-Grid's grouping module is enterprise-only, so this checks the height handed to ag-Grid.
    it('sizes group rows to a changed groupRowHeight', async () => {
        const {gridModel} = await renderGridAsync({groupBy: 'name'}),
            {agApi} = gridModel,
            groupRowHeight = () =>
                agApi.getGridOption('getRowHeight')({node: {group: true}} as any),
            resetRowHeights = vi.spyOn(agApi, 'resetRowHeights');
        expect(groupRowHeight()).not.toBe(40);

        gridModel.groupRowHeight = 40;

        await waitFor(() => expect(groupRowHeight()).toBe(40));
        await waitFor(() => expect(resetRowHeights).toHaveBeenCalled());
    });
});

async function renderGridAsync(config: GridConfig = {}) {
    const gridModel = new GridModel({columns: [{field: 'name'}, {field: 'qty'}], ...config});
    onTestFinished(() => gridModel.destroy());
    gridModel.loadData([
        {id: 1, name: 'Alpha', qty: 1},
        {id: 2, name: 'Beta', qty: 2}
    ]);

    const {container} = render(grid({model: gridModel, width: 600, height: 400}));
    await waitFor(() => expect(container.querySelector('.ag-row')).not.toBeNull());
    return {gridModel};
}
