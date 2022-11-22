/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import * as Col from '@xh/hoist/cmp/grid/columns';
import {truncate} from 'lodash';
import { ColumnSpec } from '@xh/hoist/cmp/grid/columns';

export const value = {
    field: {name: 'value', type: 'auto'},
    width: 200,
    autosizeMaxWidth: 400,
    renderer: truncateValue
} as ColumnSpec;

export const defaultValue = {
    field: {name: 'defaultValue', type: 'auto'},
    width: 200,
    autosizeMaxWidth: 400,
    renderer: truncateIfJson
} as ColumnSpec;

export const userValue = {
    field: {name: 'userValue', type: 'auto'},
    flex: true,
    minWidth: 200,
    renderer: truncateIfJson
} as ColumnSpec;

export const valueType = {
    field: {
        name: 'valueType',
        type: 'string',
        displayName: 'Type'
    },
    width: 80,
    align: 'center'
} as ColumnSpec;

export const groupName = {
    field: {
        name: 'groupName',
        type: 'string',
        displayName: 'Group'
    },
    width: 100
} as ColumnSpec;

export const clientVisible = {
    field: {name: 'clientVisible', type: 'bool'},
    ...Col.boolCheck,
    displayName: 'Client?',
    width: 75
} as ColumnSpec;

export const local = {
    field: {name: 'local', type: 'bool'},
    ...Col.boolCheck,
    width: 75
} as ColumnSpec;

function truncateIfJson(value, {record}) {
    return record.data.type === 'json' ? truncateValue(value) : value?.toString();
}

function truncateValue(value) {
    return truncate(value, {length: 500});
}
