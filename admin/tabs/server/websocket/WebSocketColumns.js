/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import * as Col from '@xh/hoist/cmp/grid/columns';

const {BOOL, DATE, INT, STRING} = FieldType;

export const isOpen = {
    field: {name: 'isOpen', type: BOOL},
    headerName: '',
    align: 'center',
    width: 40,
    renderer: v => v ?
        Icon.circle({prefix: 'fas', className: 'xh-green', asHtml: true}) :
        Icon.circle({prefix: 'fal', className: 'xh-red', asHtml: true})
};

export const key = {
    field: {name: 'key', type: STRING},
    width: 160
};

export const createdTime = {
    field: {
        name: 'createdTime',
        type: DATE,
        displayName: 'Created'
    },
    ...Col.compactDate
};

export const sentMessageCount = {
    field: {
        name: 'sentMessageCount',
        type: INT,
        displayName: 'Sent'
    },
    ...Col.number,
    width: 90
};

export const lastSentTime = {
    field: {
        name: 'lastSentTime',
        type: DATE,
        displayName: 'Last Sent'
    },
    ...Col.compactDate,
    width: 140
};

export const receivedMessageCount = {
    field: {
        name: 'receivedMessageCount',
        type: INT,
        displayName: 'Received'
    },
    ...Col.number,
    width: 90
};

export const lastReceivedTime = {
    field: {
        name: 'lastReceivedTime',
        type: DATE,
        displayName: 'Last Received'
    },
    ...Col.compactDate,
    width: 140
};