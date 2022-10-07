/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {RecordAction} from '@xh/hoist/data';
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {throwIf} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isEmpty} from 'lodash';

import './Actions.scss';

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
    displayName: 'Actions',
    headerName: null,
    cellClass: 'xh-action-col-cell',
    align: 'center',
    sortable: false,
    resizable: false,
    filterable: false,
    excludeFromExport: true,
    rendererIsComplex: true,
    renderer: (value, {record, column, agParams}) => {
        if (agParams.node.group || (record && record.isSummary)) return null;

        const {actions, actionsShowOnHoverOnly, gridModel} = column;
        if (isEmpty(actions)) return null;

        const buttons = actions.map(action => {
            action = new RecordAction(action);

            const {icon, intent, className, disabled, tooltip, hidden} = action.getDisplaySpec({record, selectedRecords: [record], gridModel, column});
            throwIf(!icon, 'An icon is required for any RecordAction rendered within a grid action column.');

            if (hidden) return null;

            return button({
                icon,
                disabled,
                tooltip,
                intent,
                className: classNames(
                    'bp4-small',
                    'xh-record-action-button',
                    className
                ),
                onClick: (ev) => {
                    ev.stopPropagation();
                    action.call({record, selectedRecords: [record], gridModel, column});
                }
            });
        });

        return buttonGroup({
            className: actionsShowOnHoverOnly ? 'xh-show-on-hover' : null,
            items: buttons
        });
    }
};

/**
 * Calculates the width for an action column
 * @param {number} count - number of actions
 * @param {number} [cellPadding] - desired left and right padding (in pixels) for the action cell.
 * @param {number} [buttonWidth] - width (in pixels) of the action buttons.
 *      Default small minimal buttons with an icon will be 24px
 * @returns {number} - the width in pixels
 */
export function calcActionColWidth(count, cellPadding = 5, buttonWidth = 24) {
    // add 1 to cellPadding to account for 1px transparent border in default theme
    return (count * buttonWidth) + ((cellPadding + 1) * 2);
}
