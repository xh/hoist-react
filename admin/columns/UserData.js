/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {truncate} from 'lodash';

const {AUTO, BOOL, STRING} = FieldType;

export const value = {
    field: {name: 'value', type: AUTO},
    width: 200,
    autosizeMaxWidth: 400,
    renderer: truncateValue
};

export const defaultValue = {
    field: {name: 'defaultValue', type: AUTO},
    width: 200,
    autosizeMaxWidth: 400,
    renderer: truncateIfJson
};

export const userValue = {
    field: {name: 'userValue', type: AUTO},
    flex: true,
    minWidth: 200,
    renderer: truncateIfJson
};

export const valueType = {
    field: {
        name: 'valueType',
        type: STRING,
        displayName: 'Type'
    },
    width: 80,
    align: 'center'
};

export const groupName = {
    field: {
        name: 'groupName',
        type: STRING,
        displayName: 'Group'
    },
    width: 100
};

export const clientVisible = {
    field: {name: 'clientVisible', type: BOOL},
    ...Col.boolCheck,
    displayName: 'Client?',
    width: 75
};

export const local = {
    field: {name: 'local', type: BOOL},
    ...Col.boolCheck,
    width: 75
};

function truncateIfJson(value, {record}) {
    return record.data.type === 'json' ? truncateValue(value) : value?.toString();
}

function truncateValue(value) {
    return truncate(value, {length: 500});
}
