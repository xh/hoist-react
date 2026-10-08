/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';
import {getDataRowHeight, getGroupRowHeight, hasUniformRowHeights} from './RowHeightUtils';

/**
 * The row heights Grid drives into ag-Grid, and the decision of whether it must evaluate them
 * for every row up front. Grids with uniform rows skip that pass and let ag-Grid position rows
 * from `--ag-row-height` - so a wrong answer here means a scroll hitch or wasted work per load.
 */
describe('RowHeightUtils', () => {
    beforeAll(() => initTestAppAsync());

    const heights = (AgGrid as any).ROW_HEIGHTS,
        groupHeights = (AgGrid as any).GROUP_ROW_HEIGHTS,
        defaultGetRowHeight = () => 0;

    describe('getDataRowHeight', () => {
        it('is the sizing mode height', () => {
            expect(getDataRowHeight(createGridModel({sizingMode: 'standard'}))).toBe(
                heights.standard
            );
            expect(getDataRowHeight(createGridModel({sizingMode: 'tiny'}))).toBe(heights.tiny);
        });

        it('is raised to the tallest rowHeight among visible columns only', () => {
            const gridModel = createGridModel({
                columns: [
                    {field: 'name', rowHeight: heights.standard + 20},
                    {field: 'region', rowHeight: heights.standard + 40, hidden: true}
                ]
            });
            expect(getDataRowHeight(gridModel)).toBe(heights.standard + 20);

            gridModel.updateColumnState([{colId: 'region', hidden: false}]);
            expect(getDataRowHeight(gridModel)).toBe(heights.standard + 40);
        });
    });

    describe('getGroupRowHeight', () => {
        it('is the full-width group row height for groupRows, else the data row height', () => {
            const gridModel = createGridModel({sizingMode: 'compact'});
            expect(getGroupRowHeight(gridModel, 'groupRows')).toBe(groupHeights.compact);
            expect(getGroupRowHeight(gridModel, 'custom')).toBe(heights.compact);
        });

        it('is GridModel.groupRowHeight when set', () => {
            const gridModel = createGridModel({groupRowHeight: 50});
            expect(getGroupRowHeight(gridModel, 'groupRows')).toBe(50);
            expect(getGroupRowHeight(gridModel, 'custom')).toBe(50);
        });
    });

    describe('hasUniformRowHeights', () => {
        const agOptions = {getRowHeight: defaultGetRowHeight, groupDisplayType: 'groupRows'} as any;

        it('is true for a flat grid using the default getRowHeight', () => {
            expect(hasUniformRowHeights(createGridModel(), agOptions, defaultGetRowHeight)).toBe(
                true
            );
        });

        it('is false when the app supplies its own getRowHeight', () => {
            const custom = {...agOptions, getRowHeight: () => 10};
            expect(hasUniformRowHeights(createGridModel(), custom, defaultGetRowHeight)).toBe(
                false
            );
        });

        it('is false when a visible column has autoHeight', () => {
            const gridModel = createGridModel({
                columns: [{field: 'name'}, {field: 'notes', autoHeight: true, hidden: true}]
            });
            expect(hasUniformRowHeights(gridModel, agOptions, defaultGetRowHeight)).toBe(true);

            gridModel.updateColumnState([{colId: 'notes', hidden: false}]);
            expect(hasUniformRowHeights(gridModel, agOptions, defaultGetRowHeight)).toBe(false);
        });

        it('follows grouping, as group rows are shorter than data rows', () => {
            const gridModel = createGridModel();
            expect(hasUniformRowHeights(gridModel, agOptions, defaultGetRowHeight)).toBe(true);

            gridModel.setGroupBy('region');
            expect(hasUniformRowHeights(gridModel, agOptions, defaultGetRowHeight)).toBe(false);

            gridModel.setGroupBy(null);
            expect(hasUniformRowHeights(gridModel, agOptions, defaultGetRowHeight)).toBe(true);
        });

        it('is true for a grouped grid whose groupRowHeight matches its data rows', () => {
            const gridModel = createGridModel({
                groupBy: 'region',
                groupRowHeight: heights.standard
            });
            expect(hasUniformRowHeights(gridModel, agOptions, defaultGetRowHeight)).toBe(true);
        });

        it('is true for a tree grid unless groupRowHeight differs from its data rows', () => {
            const treeOptions = {...agOptions, groupDisplayType: 'custom'};
            expect(
                hasUniformRowHeights(
                    createGridModel({treeMode: true}),
                    treeOptions,
                    defaultGetRowHeight
                )
            ).toBe(true);
            expect(
                hasUniformRowHeights(
                    createGridModel({treeMode: true, groupRowHeight: 40}),
                    treeOptions,
                    defaultGetRowHeight
                )
            ).toBe(false);
        });
    });
});

function createGridModel(config: GridConfig = {}): GridModel {
    const ret = new GridModel({
        sizingMode: 'standard',
        columns: [{field: 'name'}, {field: 'region'}],
        ...config
    });
    onTestFinished(() => ret.destroy());
    return ret;
}
