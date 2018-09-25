/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {storeActionBar} from '@xh/hoist/desktop/cmp/store';

export const actionsCol = {
    colId: 'actions',
    headerName: '',
    chooserName: 'Actions',
    chooserDescription: 'Row Actions',
    align: 'center',
    excludeFromExport: true,
    elementRenderer: ({column, ...rest}) => storeActionBar({actions: column.actions, actionsShowOnHover: column.actionsShowOnHover, ...rest})
};