/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import * as Col from '@xh/hoist/cmp/grid/columns';
import {truncate} from 'lodash';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';

export const value: ColumnSpec = {
    field: {name: 'value', type: 'auto'},
    width: 200,
    autosizeMaxWidth: 400,
    renderer: truncateValue
};

export const defaultValue: ColumnSpec = {
    field: {name: 'defaultValue', type: 'auto'},
    width: 200,
    autosizeMaxWidth: 400,
    renderer: truncateIfJson
};

export const userValue: ColumnSpec = {
    field: {name: 'userValue', type: 'auto'},
    flex: true,
    minWidth: 200,
    renderer: truncateIfJson
};

export const valueType: ColumnSpec = {
    field: {
        name: 'valueType',
        type: 'string',
        displayName: 'Type'
    },
    width: 80,
    align: 'center'
};

export const groupName: ColumnSpec = {
    field: {
        name: 'groupName',
        type: 'string',
        displayName: 'Group'
    },
    width: 100
};

export const clientVisible: ColumnSpec = {
    field: {name: 'clientVisible', type: 'bool'},
    ...Col.boolCheck,
    displayName: 'Client?',
    width: 75
};

function truncateIfJson(value, {record}) {
    return record.data.type === 'json' ? truncateValue(value) : value?.toString();
}

function truncateValue(value) {
    return truncate(value, {length: 500});
}
