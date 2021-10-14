/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {boolCheckCol} from '@xh/hoist/cmp/grid';
import {truncate} from 'lodash';

const {AUTO, BOOL, STRING} = FieldType;

export const value = {
    field: {name: 'value', type: AUTO},
    flex: 1,
    renderer: truncateValue
};

export const defaultValue = {
    field: {name: 'defaultValue', type: AUTO},
    width: 200,
    renderer: truncateIfJson
};

export const userValue = {
    field: {name: 'userValue', type: AUTO},
    minWidth: 200,
    flex: true,
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
    ...boolCheckCol,
    displayName: 'Client?',
    width: 75
};

export const local = {
    field: {name: 'local', type: BOOL},
    ...boolCheckCol,
    width: 75
};

function truncateIfJson(value, {record}) {
    return record.data.type === 'json' ? truncateValue(value) : value;
}

function truncateValue(value) {
    return truncate(value, {length: 500});
}