/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {fileColFactory} from 'hoist/columns/Utils.js';
import {numberRenderer} from '../../format/index.js';

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
// Activity
//----------------------

export const msg = colFactory({
    text: 'Message',
    field: 'msg',
    width: 60
});

export const category = colFactory({
    text: 'Category',
    field: 'category',
    width: 100
});

export const device = colFactory({
    text: 'Device',
    field: 'device',
    width: 60
});

export const browser = colFactory({
    text: 'Browser',
    field: 'browser',
    width: 100
});

export const userAgent = colFactory({
    text: 'User Agent',
    field: 'userAgent'
});

export const data = colFactory({
    text: 'Data',
    field: 'data',
    flex: 1
});

export const impersonating = colFactory({
    text: 'Impersonating',
    field: 'impersonating',
    width: 120
});

export const elapsed = colFactory({
    text: 'Elapsed (ms)',
    field: 'elapsed',
    width: 60,
    valueFormatter: numberRenderer({precision: 0})
});

export const severity = colFactory({
    width: 60,
    field: 'severity'
});

//----------------------
// Configs
//----------------------

export const valueTypeCol = colFactory({
    text: 'Type',
    field: 'valueType',
    maxWidth: 60
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

export const heapSizeCol = colFactory({
    text: 'Heap Size (MB)',
    field: 'heapSize',
    width: 130
});

export const entriesCol = colFactory({
    text: 'Entries',
    field: 'entries',
    width: 130
});

export const statusCol = colFactory({
    text: 'Status',
    field: 'status',
    flex: 0.25
});

//----------------------
// Dashboard
//----------------------
export const appCodeCol = colFactory({
    text: 'App Code',
    field: 'appCode',
    width: 100
});

export const definitionCol = colFactory({
    field: 'definition',
    flex: 1
});

//----------------------
// Log Levels
//----------------------
export const defaultLevelCol = colFactory({
    field: 'defaultLevel',
    width: 80
});

export const levelCol = colFactory({
    field: 'level',
    width: 80
});

export const effectiveLevelCol = colFactory({
    field: 'effectiveLevel',
    width: 80
});

//----------------------
// Preferences
//----------------------

export const notesCol = colFactory({
    field: 'notes',
    flex: 2
});

export const typeCol = colFactory({
    field: 'type',
    width: 80
});

export const prefValueCol = colFactory({
    field: 'prefValue',
    flex: 1
});
