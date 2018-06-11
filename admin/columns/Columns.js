/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {fileColFactory} from '@xh/hoist/columns/Utils.js';

/**
 * Shared columns for the admin client.
 */
const colFactory = fileColFactory();

export const nameCol = colFactory({
    field: 'name',
    width: 200
});

export const nameFlexCol = colFactory({
    field: 'name',
    minWidth: 120,
    flex: 1
});

export const usernameCol = colFactory({
    headerName: 'User',
    field: 'username',
    width: 120
});