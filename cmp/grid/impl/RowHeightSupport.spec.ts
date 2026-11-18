/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import {type GridConfig, GridModel} from '@xh/hoist/cmp/grid';
import type {GridOptions} from '@xh/hoist/kit/ag-grid';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';
import {RowHeightSupport} from './RowHeightSupport';

/**
 * The row heights Grid passes to ag-Grid, and whether it needs a `getRowHeight` function at all.
 * Grids with uniform rows pass none, so ag-Grid sizes every row from `rowHeight` - a wrong answer
 * here means wrong row heights, or per-row work that need not happen.
 */
describe('RowHeightSupport', () => {
    beforeAll(() => initTestAppAsync());

    const heights = (AgGrid as any).ROW_HEIGHTS,
        groupHeights = (AgGrid as any).GROUP_ROW_HEIGHTS,
        groupRows: GridOptions = {groupDisplayType: 'groupRows'},
        tree: GridOptions = {groupDisplayType: 'custom'};

    describe('rowHeight', () => {
        it('is the sizing mode height', () => {
            expect(createSupport({sizingMode: 'standard'}).rowHeight).toBe(heights.standard);
            expect(createSupport({sizingMode: 'tiny'}).rowHeight).toBe(heights.tiny);
        });

        it('is an explicit rowHeight option in place of the sizing mode height', () => {
            expect(createSupport({}, {rowHeight: 50}).rowHeight).toBe(50);
            expect(createSupport({}, {rowHeight: 10}).rowHeight).toBe(10);
        });

        it('is raised to the tallest rowHeight among visible columns only', () => {
            const support = createSupport({
                columns: [
                    {field: 'name', rowHeight: heights.standard + 20},
                    {field: 'region', rowHeight: heights.standard + 40, hidden: true}
                ]
            });
            expect(support.rowHeight).toBe(heights.standard + 20);

            support.gridModel.updateColumnState([{colId: 'region', hidden: false}]);
            expect(support.rowHeight).toBe(heights.standard + 40);
        });
    });

    describe('groupRowHeight', () => {
        it('is the full-width group row height for groupRows, else the data row height', () => {
            expect(createSupport({sizingMode: 'compact'}, groupRows).groupRowHeight).toBe(
                groupHeights.compact
            );
            expect(createSupport({sizingMode: 'compact'}, tree).groupRowHeight).toBe(
                heights.compact
            );
            expect(createSupport({}, {...tree, rowHeight: 50}).groupRowHeight).toBe(50);
        });

        it('is GridModel.groupRowHeight when set', () => {
            expect(createSupport({groupRowHeight: 50}, groupRows).groupRowHeight).toBe(50);
            expect(createSupport({groupRowHeight: 50}, tree).groupRowHeight).toBe(50);
        });
    });

    describe('getRowHeight', () => {
        it('is null for a flat grid, so ag-Grid sizes rows from rowHeight', () => {
            expect(createSupport({}, groupRows).getRowHeight).toBeNull();
        });

        it('follows grouping, as group rows are shorter than data rows', () => {
            const support = createSupport({}, groupRows);
            support.gridModel.setGroupBy('region');
            expect(support.getRowHeight).toBeTypeOf('function');

            support.gridModel.setGroupBy(null);
            expect(support.getRowHeight).toBeNull();
        });

        it('is null for a grouped grid whose groupRowHeight matches its data rows', () => {
            const support = createSupport(
                {groupBy: 'region', groupRowHeight: heights.standard},
                groupRows
            );
            expect(support.getRowHeight).toBeNull();
        });

        it('is null for a tree grid unless groupRowHeight differs from its data rows', () => {
            expect(createSupport({treeMode: true}, tree).getRowHeight).toBeNull();
            expect(
                createSupport({treeMode: true, groupRowHeight: 40}, tree).getRowHeight
            ).toBeTypeOf('function');
        });

        it('sizes group and data rows when grouped', () => {
            const {getRowHeight} = createSupport({groupBy: 'region'}, groupRows);
            expect(getRowHeight({node: {group: true}} as any)).toBe(groupHeights.standard);
            expect(getRowHeight({node: {group: false}} as any)).toBe(heights.standard);
        });

        it('is the app getRowHeight when supplied', () => {
            const appGetRowHeight = () => 40;
            expect(createSupport({}, {getRowHeight: appGetRowHeight}).getRowHeight).toBe(
                appGetRowHeight
            );
        });
    });
});

function createSupport(config: GridConfig = {}, agOptions: GridOptions = {}): RowHeightSupport {
    const gridModel = new GridModel({
            sizingMode: 'standard',
            columns: [{field: 'name'}, {field: 'region'}],
            ...config
        }),
        // Stands in for the GridLocalModel - its model, merged options and component props.
        ret = new RowHeightSupport({
            model: gridModel,
            agOptions,
            componentProps: {agOptions}
        } as any);
    onTestFinished(() => {
        ret.destroy();
        gridModel.destroy();
    });
    return ret;
}
