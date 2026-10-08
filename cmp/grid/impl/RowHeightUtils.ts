/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AgGrid} from '@xh/hoist/cmp/ag-grid';
import type {GridOptions} from '@xh/hoist/kit/ag-grid';
import {isEmpty, max, maxBy} from 'lodash';
import type {GridModel} from '../GridModel';

/**
 * Height in pixels of a grid's data rows - the height for its sizing mode, raised to the tallest
 * `Column.rowHeight` among its visible columns.
 *
 * @internal
 */
export function getDataRowHeight(gridModel: GridModel): number {
    const AgGridCmp = AgGrid as any;
    return max([
        AgGridCmp.getRowHeightForSizingMode(gridModel.sizingMode),
        maxBy(gridModel.getVisibleLeafColumns(), 'rowHeight')?.rowHeight
    ]);
}

/**
 * Height in pixels of a grid's group rows. `GridModel.groupRowHeight` when set, otherwise the
 * full-width group row height for the sizing mode when ag-Grid renders groups as `groupRows`,
 * and the data row height when it does not (as in tree grids).
 *
 * @internal
 */
export function getGroupRowHeight(
    gridModel: GridModel,
    groupDisplayType: GridOptions['groupDisplayType']
): number {
    const {sizingMode, groupRowHeight} = gridModel,
        AgGridCmp = AgGrid as any;
    return (
        groupRowHeight ??
        (groupDisplayType === 'groupRows'
            ? AgGridCmp.getGroupRowHeightForSizingMode(sizingMode)
            : AgGridCmp.getRowHeightForSizingMode(sizingMode))
    );
}

/**
 * True if every row ag-Grid renders for this grid has the same height, so that ag-Grid can
 * position rows it has not yet rendered from `--ag-row-height` alone and Hoist need not evaluate
 * `getRowHeight` for each row up front.
 *
 * False when the app supplies its own `getRowHeight` (its heights are unknown to Hoist), when a
 * visible column has `autoHeight`, and when a grouped or tree grid gives its group rows a
 * different height from its data rows.
 *
 * @internal
 */
export function hasUniformRowHeights(
    gridModel: GridModel,
    agOptions: GridOptions,
    defaultGetRowHeight: GridOptions['getRowHeight']
): boolean {
    if (agOptions.getRowHeight !== defaultGetRowHeight) return false;
    if (gridModel.getVisibleLeafColumns().some(c => c.autoHeight)) return false;

    const hasGroupRows = !isEmpty(gridModel.groupBy) || gridModel.treeMode;
    return (
        !hasGroupRows ||
        getGroupRowHeight(gridModel, agOptions.groupDisplayType) === getDataRowHeight(gridModel)
    );
}
