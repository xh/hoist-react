/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {Icon} from '@xh/hoist/icon';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';

export const isOpen: ColumnSpec = {
    field: {name: 'isOpen', type: 'bool'},
    headerName: '',
    align: 'center',
    width: 40,
    renderer: v =>
        v
            ? Icon.circle({prefix: 'fas', className: 'xh-green'})
            : Icon.circle({prefix: 'fal', className: 'xh-red'})
};

export const key: ColumnSpec = {
    field: {name: 'key', type: 'string'},
    width: 160
};

export const createdTime: ColumnSpec = {
    field: {
        name: 'createdTime',
        type: 'date',
        displayName: 'Created'
    },
    ...Col.compactDate
};

export const sentMessageCount: ColumnSpec = {
    field: {
        name: 'sentMessageCount',
        type: 'int',
        displayName: 'Sent'
    },
    ...Col.number,
    width: 90
};

export const lastSentTime: ColumnSpec = {
    field: {
        name: 'lastSentTime',
        type: 'date',
        displayName: 'Last Sent'
    },
    ...Col.compactDate,
    width: 140
};

export const receivedMessageCount: ColumnSpec = {
    field: {
        name: 'receivedMessageCount',
        type: 'int',
        displayName: 'Received'
    },
    ...Col.number,
    width: 90
};

export const lastReceivedTime: ColumnSpec = {
    field: {
        name: 'lastReceivedTime',
        type: 'date',
        displayName: 'Last Received'
    },
    ...Col.compactDate,
    width: 140
};
