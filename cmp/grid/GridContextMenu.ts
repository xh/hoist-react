/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {MenuToken} from '@xh/hoist/core';
import {RecordActionLike} from '@xh/hoist/data';
import {DefaultMenuItem, GetContextMenuItemsParams} from '@xh/hoist/kit/ag-grid';

/**
 * An entry within a grid context menu.
 *
 * Strings are tokens - either one of Hoist's own {@link GridContextMenuToken} (which includes '-'
 * for a separator) or one of ag-Grid's built-in `DefaultMenuItem` tokens.
 * {@link https://www.ag-grid.com/javascript-grid-context-menu/#built-in-menu-items}
 *
 * Note that `RecordActionLike` also admits a {@link MenuHeading} - i.e. `{heading: 'Section'}` -
 * to label and group the items below it.
 */
export type GridContextMenuItemLike = RecordActionLike | GridContextMenuToken | DefaultMenuItem;

/**
 * Hoist tokens, all of which require a GridModel - plus {@link MenuToken} ('-') for a separator:
 *          `autosizeColumns` - autosize columns to fit their contents.
 *          `copyCell` - copy cell value to clipboard.
 *          `colChooser` - show the grid's column chooser, in whichever presentation it is
 *              configured for. Toggles the dock when `mode: 'docked'`.
 *          `expandCollapse` - expand/collapse parent rows on grouped or tree grid.
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
    | 'expandCollapse'
    | 'export'
    | 'exportExcel'
    | 'exportCsv'
    | 'exportLocal'
    | 'filter'
    | 'restoreDefaults'
    | MenuToken;

/**
 * Specification for a GridContextMenu.  Either a list of items, or a function to produce one.
 */
export type GridContextMenuSpec =
    | GridContextMenuItemLike[]
    | ((agParams: GetContextMenuItemsParams, gridModel: GridModel) => GridContextMenuItemLike[]);
