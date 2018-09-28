/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {recordActionBar} from '@xh/hoist/desktop/cmp/record';

export const actionCol = {
    colId: 'actions',
    headerName: null,
    align: 'center',
    sortable: false,
    resizable: false,
    chooserName: 'Actions',
    chooserDescription: 'Record Actions',
    excludeFromExport: true,
    elementRenderer: (value, {record, column, ...rest}) => {
        return recordActionBar({
            actions: column.actions,
            showOnHover: column.actionsShowOnHover,
            record,
            ...rest
        });
    }
};

/**
 * Calculates the width for an action column
 * @param {number} count - number of actions
 * @param {number} [cellPadding] - left and right padding (in pixels) for grid cells.
 *      Default theme is 11px padding + 1px transparent border on each side
 * @param {number} [buttonWidth] - width (in pixels) of the action buttons.
 *      Default small minimal buttons with an icon will be 24px
 * @returns {number} - the width in pixels
 */
export function calcActionColWidth(count, cellPadding = 12, buttonWidth = 24) {
    return count * buttonWidth + cellPadding * 2;
}