/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {RecordAction, RecordActionLike} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {GetContextMenuItemsParams} from '@xh/hoist/kit/ag-grid';
import {isFunction} from 'lodash';
import {DisplayFnData} from '../../data';

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
    | 'expandCollapse'
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

export function createGridOpenToDepthMenuItem(): RecordAction {
    return new RecordAction({
        text: 'Expand to Level',
        displayFn: (params: DisplayFnData) => {
            const {gridModel} = params,
                {levelLabels, store} = gridModel,
                {maxDepth} = store;

            let nodeLevelLabels = isFunction(levelLabels) ? levelLabels(params) : levelLabels;

            if (!levelLabels || nodeLevelLabels.length < maxDepth + 1) {
                console.warn(
                    'GridContextMenu: `levelLabels` not provided or of insufficient length. Using default labels.'
                );
                nodeLevelLabels = defaultNodeLevelLabels(maxDepth);
            }

            const items = nodeLevelLabels.map((label, idx) => {
                return {
                    icon:
                        gridModel.expandToLevel === idx ||
                        (gridModel.expandToLevel > maxDepth && idx === nodeLevelLabels.length - 1)
                            ? Icon.check()
                            : null,
                    text: label,
                    actionFn: () => gridModel.setExpandToLevel(idx)
                };
            });

            return {items};
        }
    });
}

function defaultNodeLevelLabels(maxDepth: number): string[] {
    const ret = [];

    for (let i = 0; i <= maxDepth; i++) {
        ret.push(`Level ${i + 1}`);
    }

    return ret;
}
