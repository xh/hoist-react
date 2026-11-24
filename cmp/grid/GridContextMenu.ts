/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridModel} from '@xh/hoist/cmp/grid';
import type {MenuToken} from '@xh/hoist/core';
import type {RecordActionHeading, RecordActionLike} from '@xh/hoist/data';
import type {
    DefaultMenuItem,
    GetContextMenuItemsParams,
    GetMainMenuItemsParams
} from '@xh/hoist/kit/ag-grid';

/**
 * An entry within a grid context menu - a RecordAction or its spec, a {@link MenuHeading} such as
 * `{heading: 'Section'}`, or a string token.
 *
 * For a token, use either a Hoist {@link GridContextMenuToken}, which includes '-' for a
 * separator, or an ag-Grid `DefaultMenuItem` token.
 * {@link https://www.ag-grid.com/javascript-grid-context-menu/#built-in-menu-items}
 */
export type GridContextMenuItemLike =
    RecordActionLike | RecordActionHeading | GridContextMenuToken | DefaultMenuItem;

/**
 * Hoist tokens, all of which require a GridModel - plus {@link MenuToken} ('-') for a separator:
 *          `autosizeColumn` - autosize the clicked column to fit its contents.
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
 *          `hideColumn` - hide the clicked column.
 *          `pinColumn` - sub menu to pin the clicked column left or right, or unpin it.
 *          `restoreDefaults` - restore column, sorting, and grouping configs and clear any
 *              persistent grid state. See {@link GridModel.restoreDefaults}
 *          `sort` - one item per sort the clicked column offers, per `Column.sortingOrder`.
 *
 * The clicked-column tokens hide themselves when no column is in context, e.g. on a right-click
 * over a column group header.
 */
export type GridContextMenuToken =
    | 'autosizeColumn'
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
    | 'hideColumn'
    | 'pinColumn'
    | 'restoreDefaults'
    | 'sort'
    | MenuToken;

/**
 * Specification for a GridContextMenu.  Either a list of items, or a function to produce one.
 */
export type GridContextMenuSpec =
    | GridContextMenuItemLike[]
    | ((agParams: GetContextMenuItemsParams, gridModel: GridModel) => GridContextMenuItemLike[]);

/**
 * Specification for the context menu shown on right-click of a column header. Either a list of
 * items, or a function to produce one. The function receives the ag-Grid params for the clicked
 * header, which carry no row.
 */
export type GridHeaderContextMenuSpec =
    | GridContextMenuItemLike[]
    | ((agParams: GetMainMenuItemsParams, gridModel: GridModel) => GridContextMenuItemLike[]);
