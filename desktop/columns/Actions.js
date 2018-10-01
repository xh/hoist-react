/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {withDefault} from '@xh/hoist/utils/js';

import {actionColPad} from './Actions.scss';

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
            context: column.getContext(),
            minimal: true,
            small: true,
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