/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {grid, type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {render, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * What the Grid component hands to ag-Grid, and what ag-Grid renders from it. Row and header
 * heights and the per-cell rendering path are the contracts that decide a grid's rendering cost.
 */
describe('Grid', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        installAgGridForTests();
    });

    const rowHeights = (AgGrid as any).ROW_HEIGHTS,
        headerHeights = (AgGrid as any).HEADER_HEIGHTS;

    it('publishes its row and header heights to ag-Grid as theme variables', async () => {
        const {gridModel, frame} = await renderGridAsync({sizingMode: 'compact'});
        expect(frame.style.getPropertyValue('--ag-row-height')).toBe(`${rowHeights.compact}px`);
        expect(frame.style.getPropertyValue('--ag-header-height')).toBe(
            `${headerHeights.compact}px`
        );

        gridModel.sizingMode = 'large';
        await waitFor(() =>
            expect(frame.style.getPropertyValue('--ag-row-height')).toBe(`${rowHeights.large}px`)
        );
        expect(frame.style.getPropertyValue('--ag-header-height')).toBe(`${headerHeights.large}px`);
    });

    it('raises the row height variable to the tallest visible Column.rowHeight', async () => {
        const {frame} = await renderGridAsync({
            columns: [{field: 'name', rowHeight: rowHeights.standard + 30}, {field: 'qty'}]
        });
        expect(frame.style.getPropertyValue('--ag-row-height')).toBe(
            `${rowHeights.standard + 30}px`
        );
    });

    it('hands ag-Grid the header height for its sizing mode, and 0 to hide headers', async () => {
        const {gridModel} = await renderGridAsync({sizingMode: 'standard'}),
            {agApi} = gridModel;
        expect(agApi.getGridOption('headerHeight')).toBe(headerHeights.standard);

        gridModel.hideHeaders = true;
        await waitFor(() => expect(agApi.getGridOption('headerHeight')).toBe(0));
    });

    it('renders columns without a renderer as plain text, and others through the wrapper', async () => {
        const {container} = await renderGridAsync({
                columns: [{field: 'name'}, {field: 'qty', renderer: v => `${v}!`}]
            }),
            [name, qty] = container.querySelectorAll('.ag-row[row-id="ag_1"] .ag-cell');

        expect(name.classList.contains('xh-cell--plain')).toBe(true);
        expect(name.querySelector('.xh-cell-inner-wrapper')).toBeNull();
        expect(name.textContent).toBe('Alpha');

        expect(qty.classList.contains('xh-cell--plain')).toBe(false);
        expect(qty.querySelector('.xh-cell-inner-wrapper').textContent).toBe('1!');
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
    await waitFor(() => expect(container.querySelectorAll('.ag-row')).toHaveLength(2));
    return {gridModel, container, frame: container.querySelector('.xh-ag-grid') as HTMLElement};
}
