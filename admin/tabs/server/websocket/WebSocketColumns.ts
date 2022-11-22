/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {Icon} from '@xh/hoist/icon';
import * as Col from '@xh/hoist/cmp/grid/columns';
import { ColumnSpec } from '@xh/hoist/cmp/grid/columns';

export const isOpen = {
    field: {name: 'isOpen', type: 'bool'},
    headerName: '',
    align: 'center',
    width: 40,
    renderer: v => v ?
        Icon.circle({prefix: 'fas', className: 'xh-green'}) :
        Icon.circle({prefix: 'fal', className: 'xh-red'})
} as ColumnSpec;

export const key = {
    field: {name: 'key', type: 'string'},
    width: 160
} as ColumnSpec;

export const createdTime = {
    field: {
        name: 'createdTime',
        type: 'date',
        displayName: 'Created'
    },
    ...Col.compactDate
} as ColumnSpec;

export const sentMessageCount = {
    field: {
        name: 'sentMessageCount',
        type: 'int',
        displayName: 'Sent'
    },
    ...Col.number,
    width: 90
} as ColumnSpec;

export const lastSentTime = {
    field: {
        name: 'lastSentTime',
        type: 'date',
        displayName: 'Last Sent'
    },
    ...Col.compactDate,
    width: 140
} as ColumnSpec;

export const receivedMessageCount = {
    field: {
        name: 'receivedMessageCount',
        type: 'int',
        displayName: 'Received'
    },
    ...Col.number,
    width: 90
} as ColumnSpec;

export const lastReceivedTime = {
    field: {
        name: 'lastReceivedTime',
        type: 'date',
        displayName: 'Last Received'
    },
    ...Col.compactDate,
    width: 140
} as ColumnSpec;
