/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {withDefault} from '@xh/hoist/utils/js';

import {actionColPad} from './Actions.scss';

/**
 * A column definition partial for adding an "action column" to a grid. An action column displays
 * one or more record-aware buttons within a `RecordActionBar`, providing the user with an easy
 * way to perform push-button operations on a given record. See the related classes for details on
 * how to prepare and fire these actions.
 *
 * Note that an action column can be configured with `actionsShowOnHoverOnly: true` to hide the
 * buttons for all rows except the currently hovered row. This can be a used to avoid overloading
 * the user's attention with a wall of buttons when there are many rows + multiple actions per row.
 *
 * Another useful pattern is to create re-usable `RecordAction` objects and pass those both to this
 * column config as well as a `StoreContextMenu`. This offers the user two ways of accessing actions
 * without duplicating the action definitions.
 *
 * Finally, see the `calcActionColWidth` helper function exported below - this returns a pixel width
 * for your column given a number of actions (accounting for button sizing and padding).
 *
 * @see RecordActionBar
 * @see RecordAction
 */
export const actionCol = {
    colId: 'actions',
    headerName: null,
    cellClass: 'xh-action-col-cell',
    align: 'center',
    sortable: false,
    resizable: false,
    chooserName: 'Actions',
    chooserDescription: 'Record Actions',
    excludeFromExport: true,
    elementRenderer: (value, {record, column, ...rest}) => {
        return recordActionBar({
            actions: column.actions,
            showOnHoverOnly: withDefault(column.actionsShowOnHoverOnly, false),
            record,
            ...rest
        });
    }
};

/**
 * Calculates the width for an action column
 * @param {number} count - number of actions
 * @param {number} [cellPadding] - left and right padding (in pixels) for grid cells.
 * @param {number} [buttonWidth] - width (in pixels) of the action buttons.
 *      Default small minimal buttons with an icon will be 24px
 * @returns {number} - the width in pixels
 */
export function calcActionColWidth(count, cellPadding = Number(actionColPad), buttonWidth = 24) {
    // add 1 to cellPadding to account for 1px transparent border in default theme
    return (count * buttonWidth) + ((cellPadding + 1) * 2);
}