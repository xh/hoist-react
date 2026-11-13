/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, GridModel} from '@xh/hoist/cmp/grid';
import {ColumnWidthCalculator} from '@xh/hoist/cmp/grid/impl/ColumnWidthCalculator';
import {XH} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {render, waitFor} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * An autosize pass measures one column at a time, and a grid can unmount or be destroyed while it
 * runs - a dashboard rebuilding its widgets, for example. Measuring on wastes main-thread time on
 * a grid nobody will see.
 */
describe('GridAutosizeService', () => {
    beforeAll(async () => {
        await initTestAppAsync();
        installAgGridForTests();
    });

    afterEach(() => vi.restoreAllMocks());

    it('sizes every column of a mounted grid', async () => {
        const {gridModel, calcWidth} = await renderGridAsync();

        await XH.gridAutosizeService.autosizeAsync(gridModel, ['a', 'b', 'c'], {});
        expect(calcWidth).toHaveBeenCalledTimes(3);
        expect(gridModel.columnState.map(it => it.width)).toEqual([123, 123, 123]);
    });

    it.each([
        ['unmounts', ({unmount}) => unmount()],
        ['is destroyed', ({gridModel}) => gridModel.destroy()]
    ])('stops measuring when its grid %s mid-pass', async (_, stop) => {
        const ctx = await renderGridAsync(),
            {gridModel, calcWidth} = ctx,
            widths = gridModel.columnState.map(it => it.width);
        calcWidth.mockImplementationOnce(async () => {
            stop(ctx);
            return 123;
        });

        await XH.gridAutosizeService.autosizeAsync(gridModel, ['a', 'b', 'c'], {});
        expect(calcWidth).toHaveBeenCalledTimes(1);
        expect(gridModel.columnState.map(it => it.width)).toEqual(widths);
    });
});

async function renderGridAsync() {
    const gridModel = new GridModel({
        columns: [{field: 'a'}, {field: 'b'}, {field: 'c'}],
        autosizeOptions: {mode: 'disabled'}
    });
    onTestFinished(() => gridModel.destroy());
    gridModel.loadData([{id: 1, a: 'x', b: 'y', c: 'z'}]);

    const {unmount} = render(grid({model: gridModel, width: 600, height: 400}));
    await waitFor(() => expect(gridModel.isReady).toBe(true));

    // jsdom has no layout to measure.
    const calcWidth = vi
        .spyOn(ColumnWidthCalculator.prototype, 'calcWidthAsync')
        .mockResolvedValue(123);
    return {gridModel, unmount, calcWidth};
}
