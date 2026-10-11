/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid, type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {runInAction} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {render, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

beforeAll(async () => {
    await initTestAppAsync();
    installAgGridForTests();
});

// ag-Grid's grouping and tree data modules are enterprise-only, so these tests check what the
// grid hands to ag-Grid, not which rows open.
describe('Grid expand level', () => {
    // Fixed in 89.0.0 - each level change set ag-Grid's `groupDefaultExpanded`, which regroups,
    // re-sorts and redraws every row.
    it("expands and collapses without changing ag-Grid's groupDefaultExpanded", async () => {
        const {gridModel} = await renderGridAsync(),
            {agApi} = gridModel,
            setGridOption = vi.spyOn(agApi, 'setGridOption');

        gridModel.expandToLevel(2);
        gridModel.expandAll();
        gridModel.collapseAll();

        expect(setGridOption).not.toHaveBeenCalledWith('groupDefaultExpanded', expect.anything());
        expect(agApi.getGridOption('groupDefaultExpanded')).toBe(0);
    });

    it('opens rows added later to the current expandLevel, or to all levels for -1', async () => {
        const {gridModel} = await renderGridAsync({expandLevel: 1}),
            {agApi} = gridModel,
            openLevels = () => {
                const isOpenByDefault = agApi.getGridOption('isGroupOpenByDefault');
                return [0, 1, 2].filter(level => isOpenByDefault({level} as any));
            };

        expect(openLevels()).toEqual([0]);

        gridModel.expandToLevel(2);
        expect(openLevels()).toEqual([0, 1]);

        gridModel.expandToLevel(-1);
        expect(openLevels()).toEqual([0, 1, 2]);
    });

    // With either expand default set, ag-Grid's state service walks every row after each
    // data update. At level 0, ag-Grid's own default gives the same result without it.
    it('leaves isGroupOpenByDefault unset while at level 0', async () => {
        const {gridModel} = await renderGridAsync({expandLevel: 0}),
            {agApi} = gridModel;
        expect(agApi.getGridOption('isGroupOpenByDefault')).toBeUndefined();

        gridModel.expandToLevel(1);
        expect(agApi.getGridOption('isGroupOpenByDefault')).toBeTypeOf('function');

        gridModel.collapseAll();
        expect(agApi.getGridOption('isGroupOpenByDefault')).toBeUndefined();
    });

    // A view switch changes grouping and expand level in the same action.
    it('applies a new expand level before regrouping in the same action', async () => {
        const {gridModel} = await renderGridAsync({expandLevel: 0}),
            {agApi} = gridModel,
            optionsAtRegroup = [];
        vi.spyOn(agApi, 'setRowGroupColumns').mockImplementation(() => {
            optionsAtRegroup.push(agApi.getGridOption('isGroupOpenByDefault'));
        });

        runInAction(() => {
            gridModel.setGroupBy('name');
            gridModel.expandToLevel(1);
        });
        expect(optionsAtRegroup).toHaveLength(1);
        expect(optionsAtRegroup[0]).toBeTypeOf('function');
    });

    // GridModel does not track a level set through agOptions, so its expand menus can disagree.
    it('warns once per GridModel when agOptions set groupDefaultExpanded', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        onTestFinished(() => warn.mockRestore());
        const optionWarnings = () =>
            warn.mock.calls.filter(args => args.join(' ').includes('groupDefaultExpanded'));

        await renderGridAsync();
        expect(optionWarnings()).toHaveLength(0);

        const gridModel = new GridModel({columns: [{field: 'name'}]});
        onTestFinished(() => gridModel.destroy());
        const agOptions = {groupDefaultExpanded: 1},
            {unmount} = render(grid({model: gridModel, agOptions}));
        await waitFor(() => expect(gridModel.isReady).toBe(true));
        unmount();
        render(grid({model: gridModel, agOptions}));
        await waitFor(() => expect(gridModel.isReady).toBe(true));
        expect(optionWarnings()).toHaveLength(1);
        expect(optionWarnings()[0].join(' ')).toContain("Set the GridModel's expandLevel instead");
    });

    it.each([
        ['groupDefaultExpanded', {groupDefaultExpanded: 2}],
        ['isGroupOpenByDefault', {isGroupOpenByDefault: () => true}]
    ])("leaves rows to an app's own agOptions.%s", async (_, agOptions: Record<string, any>) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        onTestFinished(() => warn.mockRestore());
        const gridModel = new GridModel({columns: [{field: 'name'}]});
        onTestFinished(() => gridModel.destroy());
        render(grid({model: gridModel, agOptions}));
        await waitFor(() => expect(gridModel.isReady).toBe(true));

        gridModel.expandToLevel(2);
        gridModel.collapseAll();

        const {agApi} = gridModel;
        expect(agApi.getGridOption('isGroupOpenByDefault')).toBe(agOptions.isGroupOpenByDefault);
        expect(agApi.getGridOption('groupDefaultExpanded')).toBe(
            agOptions.groupDefaultExpanded ?? 0
        );
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
    return {gridModel};
}
