/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {recordActionButton} from '@xh/hoist/desktop/cmp/record/impl/RecordActionButton';
import {RecordAction} from '@xh/hoist/data';
import {isEmpty} from 'lodash';

import {actionColPad} from './Actions.scss';

/**
 * A column definition partial for adding an "action column" to a grid. An action column displays
 * one or more record-aware buttons within a button group, providing the user with an easy
 * way to perform push-button operations on a given record. See the related classes for details on
 * how to prepare and fire these actions.
 *
 * Note that an action column can be configured with `actionsShowOnHoverOnly: true` to hide the
 * buttons for all rows except the currently hovered row. This can be a used to avoid overloading
 * the user's attention with a wall of buttons when there are many rows + multiple actions per row.
 *
 * Another useful pattern is to create re-usable `RecordAction` configs and pass those both to this
 * column config as well as a `StoreContextMenu`. This offers the user two ways of accessing actions
 * without duplicating the action definitions.
 *
 * See the `calcActionColWidth` helper function exported below - this returns a pixel width
 * for your column given a number of actions (accounting for button sizing and padding).
 *
 * Note that action columns will be empty for group rows.
 *
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
    elementRenderer: (value, {record, column, agParams}) => {
        if (agParams.node.group) return null;

        const {actions, actionsShowOnHoverOnly, gridModel} = column;
        if (isEmpty(actions)) return null;

        return buttonGroup({
            className: actionsShowOnHoverOnly ? 'xh-show-on-hover' : null,
            items: actions.map(it => recordActionButton({
                action: new RecordAction(it),
                record,
                gridModel,
                column,
                minimal: true,
                small: true
            }))
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