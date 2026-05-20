/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import * as Col from '@xh/hoist/cmp/grid/columns';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';
import {Icon} from '@xh/hoist/icon';

export const createdTime: ColumnSpec = {
    field: {
        name: 'createdTime',
        type: 'date',
        displayName: 'Created'
    },
    chooserGroup: 'Connection',
    ...Col.compactDate
};

export const isOpen: ColumnSpec = {
    field: {name: 'isOpen', type: 'bool'},
    chooserGroup: 'Connection',
    headerName: '',
    align: 'center',
    width: 40,
    renderer: v =>
        v
            ? Icon.circle({prefix: 'fas', className: 'xh-green'})
            : Icon.circle({prefix: 'fal', className: 'xh-red'})
};

export const key: ColumnSpec = {
    field: {
        name: 'key',
        type: 'string',
        displayName: 'Channel Key'
    },
    chooserGroup: 'Connection',
    width: 160
};

export const lastReceivedTime: ColumnSpec = {
    field: {
        name: 'lastReceivedTime',
        type: 'date',
        displayName: 'Last Received'
    },
    chooserGroup: 'Send/Receive',
    ...Col.compactDate,
    width: 140
};

export const lastSentTime: ColumnSpec = {
    field: {
        name: 'lastSentTime',
        type: 'date',
        displayName: 'Last Sent'
    },
    chooserGroup: 'Send/Receive',
    ...Col.compactDate,
    width: 140
};

export const receivedMessageCount: ColumnSpec = {
    field: {
        name: 'receivedMessageCount',
        type: 'int',
        displayName: 'Received'
    },
    chooserGroup: 'Send/Receive',
    ...Col.number,
    width: 90
};

export const sentMessageCount: ColumnSpec = {
    field: {
        name: 'sentMessageCount',
        type: 'int',
        displayName: 'Sent'
    },
    chooserGroup: 'Send/Receive',
    ...Col.number,
    width: 90
};
