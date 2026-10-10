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
 * Which records an autosize measures. By default the service sizes against every record up to
 * `maxRecords` and against rendered rows beyond it, warning once per grid when the cap applies.
 * Apps rely on `renderedRowsOnly` to pin either path, and on the cap to keep large grids usable.
 *
 * jsdom has no layout, so ag-Grid renders every row and "rendered rows" equals all rows. These
 * tests assert the path taken, not the count.
 */
describe('GridAutosizeService', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        installAgGridForTests();
    });

    describe('maxRecords', () => {
        it('sizes against all records when their count is within maxRecords', async () => {
            const {gridModel, renderedNodes, warn} = await renderGridAsync({
                autosizeOptions: {maxRecords: 3}
            });

            await gridModel.autosizeAsync();

            expect(renderedNodes).not.toHaveBeenCalled();
            expect(warn).not.toHaveBeenCalled();
            expect(gridModel.diagnostics.autosize.last).toMatchObject({
                records: 3,
                renderedRowsOnly: false
            });
        });

        it('sizes against rendered rows and warns when the count exceeds maxRecords', async () => {
            const {gridModel, renderedNodes, warn} = await renderGridAsync({
                autosizeOptions: {maxRecords: 2}
            });

            await gridModel.autosizeAsync();

            expect(renderedNodes).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0].join(' ')).toMatch(/3 records exceeds .*maxRecords \(2\)/);
            expect(gridModel.diagnostics.autosize.last.renderedRowsOnly).toBe(true);
        });

        it('warns once per grid across repeated autosizes', async () => {
            const {gridModel, warn} = await renderGridAsync({autosizeOptions: {maxRecords: 2}});

            await gridModel.autosizeAsync();
            await gridModel.autosizeAsync();

            expect(warn).toHaveBeenCalledTimes(1);
        });

        it('does not apply when renderedRowsOnly is false', async () => {
            const {gridModel, renderedNodes, warn} = await renderGridAsync({
                autosizeOptions: {renderedRowsOnly: false, maxRecords: 2}
            });

            await gridModel.autosizeAsync();

            expect(renderedNodes).not.toHaveBeenCalled();
            expect(warn).not.toHaveBeenCalled();
            expect(gridModel.diagnostics.autosize.last).toMatchObject({
                records: 3,
                renderedRowsOnly: false
            });
        });

        it('does not apply when renderedRowsOnly is true', async () => {
            const {gridModel, renderedNodes, warn} = await renderGridAsync({
                autosizeOptions: {renderedRowsOnly: true, maxRecords: 2}
            });

            await gridModel.autosizeAsync();

            expect(renderedNodes).toHaveBeenCalledTimes(1);
            expect(warn).not.toHaveBeenCalled();
            expect(gridModel.diagnostics.autosize.last.renderedRowsOnly).toBe(true);
        });

        it('does not apply when maxRecords is null', async () => {
            const {gridModel, renderedNodes, warn} = await renderGridAsync({
                autosizeOptions: {maxRecords: null}
            });

            await gridModel.autosizeAsync();

            expect(renderedNodes).not.toHaveBeenCalled();
            expect(warn).not.toHaveBeenCalled();
            expect(gridModel.diagnostics.autosize.last).toMatchObject({
                records: 3,
                renderedRowsOnly: false
            });
        });

        it('still includes summary records on the rendered-rows path', async () => {
            const {gridModel, renderedNodes} = await renderGridAsync(
                {showSummary: true, autosizeOptions: {maxRecords: 2}},
                {id: 'summary', name: 'Total', qty: 6}
            );

            await gridModel.autosizeAsync();

            expect(renderedNodes).toHaveBeenCalledTimes(1);
            const rendered = gridModel.agApi.getRenderedNodes().length;
            expect(gridModel.diagnostics.autosize.last.records).toBe(rendered + 1);
        });
    });
});

// Spies are restored after each test by the kit's `restoreMocks` setting.
async function renderGridAsync(config: GridConfig = {}, summaryData?: object) {
    // jsdom has no canvas - give the width calculator a context that measures something.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        measureText: (text: string) => ({width: text.length * 7})
    } as any);

    const gridModel = new GridModel({
        columns: [{field: 'name'}, {field: 'qty'}],
        ...config,
        autosizeOptions: {showMask: false, ...config.autosizeOptions}
    });
    onTestFinished(() => gridModel.destroy());
    gridModel.loadData(
        [
            {id: 1, name: 'Alpha', qty: 1},
            {id: 2, name: 'Beta', qty: 2},
            {id: 3, name: 'Gamma', qty: 3}
        ],
        summaryData
    );

    const {container} = render(grid({model: gridModel, width: 600, height: 400})),
        rowCount = summaryData ? 4 : 3;
    await waitFor(() => expect(container.querySelectorAll('.ag-row')).toHaveLength(rowCount));

    const renderedNodes = vi.spyOn(gridModel.agApi, 'getRenderedNodes'),
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    return {gridModel, renderedNodes, warn};
}
