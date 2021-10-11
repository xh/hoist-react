/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {compactDateCol, numberCol} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';

const {BOOL, DATE, INT, STRING} = FieldType;

//-----------------------
// Fields
//-----------------------
export const isOpenField = {
    name: 'isOpen',
    type: BOOL
};

export const keyField = {
    name: 'key',
    type: STRING
};

export const createdTimeField = {
    name: 'createdTime',
    type: DATE,
    displayName: 'Created'
};

export const sentMessageCountField = {
    name: 'sentMessageCount',
    type: INT,
    displayName: 'Sent'
};

export const lastSentTimeField = {
    name: 'lastSentTime',
    type: DATE,
    displayName: 'Last Sent'
};

export const receivedMessageCountField = {
    name: 'receivedMessageCount',
    type: INT,
    displayName: 'Received'
};

export const lastReceivedTimeField = {
    name: 'lastReceivedTime',
    type: DATE,
    displayName: 'Last Received'
};

//-----------------------
// Columns
//-----------------------
export const isOpenCol = {
    field: isOpenField,
    headerName: '',
    align: 'center',
    width: 40,
    renderer: v => v ?
        Icon.circle({prefix: 'fas', className: 'xh-green', asHtml: true}) :
        Icon.circle({prefix: 'fal', className: 'xh-red', asHtml: true})
};

export const keyCol = {
    field: keyField,
    width: 160
};

export const createdTimeCol = {
    field: createdTimeField,
    ...compactDateCol
};

export const sentMessageCountCol = {
    field: sentMessageCountField,
    ...numberCol,
    width: 90
};

export const lastSentTimeCol = {
    field: lastSentTimeField,
    ...compactDateCol,
    width: 140
};

export const receivedMessageCountCol = {
    field: receivedMessageCountField,
    ...numberCol,
    width: 90
};

export const lastReceivedTimeCol = {
    field: lastReceivedTimeField,
    ...compactDateCol,
    width: 140
};