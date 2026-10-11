/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {grid, type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {runInAction} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {installAgGridForTests} from '@xh/hoist/test-support/agGrid';
import {render, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

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

    // ag-Grid's grouping and tree data modules are enterprise-only, so these tests check what the
    // grid hands to ag-Grid, not which rows open.
    describe('expand level', () => {
        // Before v89, each level change set ag-Grid's `groupDefaultExpanded`, which regroups,
        // re-sorts and redraws every row.
        it("expands and collapses without changing ag-Grid's groupDefaultExpanded", async () => {
            const {gridModel} = await renderGridAsync(),
                {agApi} = gridModel,
                setGridOption = vi.spyOn(agApi, 'setGridOption');

            gridModel.expandToLevel(2);
            gridModel.expandAll();
            gridModel.collapseAll();

            expect(setGridOption).not.toHaveBeenCalledWith(
                'groupDefaultExpanded',
                expect.anything()
            );
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

        it.each([
            ['groupDefaultExpanded', {groupDefaultExpanded: 2}],
            ['isGroupOpenByDefault', {isGroupOpenByDefault: () => true}]
        ])(
            "leaves rows to an app's own agOptions.%s",
            async (_, agOptions: Record<string, any>) => {
                const gridModel = new GridModel({columns: [{field: 'name'}]});
                onTestFinished(() => gridModel.destroy());
                render(grid({model: gridModel, agOptions}));
                await waitFor(() => expect(gridModel.isReady).toBe(true));

                gridModel.expandToLevel(2);
                gridModel.collapseAll();

                const {agApi} = gridModel;
                expect(agApi.getGridOption('isGroupOpenByDefault')).toBe(
                    agOptions.isGroupOpenByDefault
                );
                expect(agApi.getGridOption('groupDefaultExpanded')).toBe(
                    agOptions.groupDefaultExpanded ?? 0
                );
            }
        );
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
