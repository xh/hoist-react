/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {recordActionBar} from '@xh/hoist/desktop/cmp/record';

export const actionCol = {
    colId: 'actions',
    headerName: '',
    align: 'center',
    width: 52,
    chooserName: 'Actions',
    chooserDescription: 'Record Actions',
    excludeFromExport: true,
    elementRenderer: ({column, ...rest}) => recordActionBar({actions: column.actions, actionsShowOnHover: column.actionsShowOnHover, ...rest})
};