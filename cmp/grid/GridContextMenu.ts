/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {RecordActionLike} from '@xh/hoist/data';
import {GetContextMenuItemsParams} from '@xh/hoist/kit/ag-grid';

/**
 * If a String, value can be '-' for a separator, or a token supported by ag-Grid
 * for its native menu items, or a Hoist specific token.
 * {@link https://www.ag-grid.com/javascript-grid-context-menu/#built-in-menu-items}
 */
export type GridContextMenuItemLike = RecordActionLike | GridContextMenuToken | string;

/**
 * Hoist tokens, all of which require a GridModel:
 *          `autosizeColumns` - autosize columns to fit their contents.
 *          `copyCell` - copy cell value to clipboard.
 *          `colChooser` - display column chooser for a grid.
 *          `expandCollapseAll` - expand/collapse all parent rows on grouped or tree grid.
 *          `export` - export grid data to excel via Hoist's server-side export capabilities.
 *          `exportExcel` - alias for `export`.
 *          `exportCsv` - export to CSV via Hoist's server-side export capabilities.
 *          `exportLocal` - export to Excel via ag-Grid's built-in client side export.
 *          'filter' - Sub menu to filter grid. Requires grid filtering.
 *          `restoreDefaults` - restore column, sorting, and grouping configs and clear any
 *              persistent grid state. See {@link GridModel.restoreDefaults}
 */
export type GridContextMenuToken =
    | 'autosizeColumns'
    | 'copyCell'
    | 'colChooser'
    | 'expandCollapseAll'
    | 'export'
    | 'exportExcel'
    | 'exportCsv'
    | 'exportLocal'
    | 'filter'
    | 'restoreDefaults';

/**
 * Specification for a GridContextMenu.  Either a list of items, or a function to produce one.
 */
export type GridContextMenuSpec =
    | GridContextMenuItemLike[]
    | ((agParams: GetContextMenuItemsParams, gridModel: GridModel) => GridContextMenuItemLike[]);
