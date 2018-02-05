/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {fileColFactory} from 'hoist/columns/Utils.js';

const colFactory = fileColFactory();

export const nameCol = colFactory({
    text: 'Name',
    field: 'name',
    width: 200
});

export const nameFlexCol = colFactory({
    text: 'Name',
    field: 'name',
    flex: 1,
    minWidth: 120
});

export const usernameCol = colFactory({
    text: 'User',
    field: 'username',
    width: 120
});