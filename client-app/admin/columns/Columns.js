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

//----------------------
// Configs
//----------------------

export const valueTypeCol = colFactory({
    text: 'Type',
    field: 'valueType',
    width: 60
});

export const confValCol = colFactory({
    width: 175
});

export const groupNameCol = colFactory({
    width: 80
});

export const noteCol = colFactory({
    text: 'Type',
    field: 'note',
    flex: 1
});

//----------------------
// EhCache
//----------------------

export const heapSize = colFactory({
    text: 'Heap Size (MB)',
    field: 'heapSize',
    width: 130
});

export const entries = colFactory({
    text: 'Entries',
    field: 'entries',
    width: 130
});

export const status = colFactory({
    text: 'Status',
    field: 'status',
    flex: 0.25
});