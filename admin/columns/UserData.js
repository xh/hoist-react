/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {boolCheckCol, dateTimeCol} from '@xh/hoist/cmp/grid';
import {fmtDateTime} from '@xh/hoist/format';
import {truncate} from 'lodash';

const {AUTO, BOOL, DATE, JSON, STRING} = FieldType;

//-----------------------
// Fields
//-----------------------
export const valueField = {
    name: 'value',
    type: AUTO
};

export const defaultValueField = {
    name: 'defaultValue',
    type: AUTO
};

export const userValueField = {
    name: 'userValue',
    type: AUTO
};

export const valueTypeField = {
    name: 'valueType',
    type: STRING,
    displayName: 'Type'
};

export const groupNameField = {
    name: 'groupName',
    type: STRING,
    displayName: 'Group'
};

export const clientVisibleField = {
    name: 'clientVisible',
    type: BOOL
};

export const localField = {
    name: 'local',
    type: BOOL
};

export const metaField = {
    name: 'meta',
    type: JSON
};

export const tokenField = {
    name: 'token',
    type: STRING
};

export const ownerField = {
    name: 'owner',
    type: STRING
};

export const aclField = {
    name: 'acl',
    type: STRING,
    displayName: 'ACL'
};

export const archivedField = {
    name: 'archived',
    type: BOOL
};

export const archivedDateField = {
    name: 'archivedDate',
    type: DATE
};

//-----------------------
// Columns
//-----------------------
export const valueCol = {
    field: valueField,
    flex: 1,
    renderer: truncateValue
};

export const defaultValueCol = {
    field: defaultValueField,
    width: 200,
    renderer: truncateIfJson
};

export const userValueCol = {
    field: userValueField,
    minWidth: 200,
    flex: true,
    renderer: truncateIfJson
};

export const valueTypeCol = {
    field: valueTypeField,
    width: 80,
    align: 'center'
};

export const groupNameCol = {
    field: groupNameField,
    width: 100
};

export const clientVisibleCol = {
    field: clientVisibleField,
    ...boolCheckCol,
    displayName: 'Client?',
    width: 75
};

export const localCol = {
    field: localField,
    ...boolCheckCol,
    width: 75
};

export const metaCol = {
    field: metaField,
    width: 200
};

export const tokenCol = {
    field: tokenField,
    width: 100
};

export const archivedCol = {
    field: archivedField,
    ...boolCheckCol,
    width: 100
};

export const ownerCol = {
    field: ownerField,
    width: 200
};

export const aclCol = {
    field: aclField,
    width: 80
};

export const archivedDateCol = {
    field: archivedDateField,
    ...dateTimeCol,
    renderer: archivedDateRenderer
};

export function archivedDateRenderer(v) {
    return v > 0 ? fmtDateTime(v) : '-';
}

function truncateIfJson(value, {record}) {
    return record.data.type === 'json' ? truncateValue(value) : value;
}

function truncateValue(value) {
    return truncate(value, {length: 500});
}