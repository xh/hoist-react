/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {RecordAction} from '@xh/hoist/data';
import {convertIconToSvg} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';

import {actionColPad} from './Actions.scss';

/**
 * A column definition partial for adding an "action column" to a grid. An action column displays
 * one or more record-aware buttons within a button group, providing the user with an easy
 * way to perform push-button operations on a given record.
 *
 * Configure the actions to display within your column by layering on an `actions` array of config
 * objects with the partial below. See the related classes for full details on how to configure,
 * prepare, and handle these actions.
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
    excludeFromExport: true,
    rendererIsComplex: true,
    renderer: (value, {record, column, agParams}) => {
        if (agParams.node.group || (record && record.xhIsSummary)) return null;

        const {actions, actionsShowOnHoverOnly, gridModel} = column;
        if (isEmpty(actions)) return null;

        const buttonGroupEl = document.createElement('div');
        buttonGroupEl.classList.add('bp3-button-group', 'xh-button-group');
        if (actionsShowOnHoverOnly) {
            buttonGroupEl.classList.add('xh-show-on-hover');
        }

        actions.forEach(action => {
            action = new RecordAction(action);

            const {icon, intent, disabled, tooltip, hidden} = action.getDisplaySpec({record, selectedRecords: [record], gridModel, column});
            if (hidden) return;

            const actionButtonEl = document.createElement('button');
            actionButtonEl.classList.add('bp3-button', 'bp3-minimal', 'bp3-small', 'xh-button', 'xh-record-action-button', 'xh-button--minimal');

            if (disabled) actionButtonEl.setAttribute('disabled', 'true');
            if (!isEmpty(tooltip)) actionButtonEl.setAttribute('title', tooltip);
            if (!isEmpty(intent)) actionButtonEl.classList.add(`bp3-intent-${intent}`);

            actionButtonEl.innerHTML = convertIconToSvg(icon);
            actionButtonEl.addEventListener('click', (ev) => {
                ev.stopPropagation();
                action.actionFn({record, selectedRecords: [record], gridModel, column});
            });

            buttonGroupEl.appendChild(actionButtonEl);
        });

        return buttonGroupEl;
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