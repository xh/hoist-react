/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';

const {STRING} = FieldType;

//-----------------------
// Fields
//-----------------------
export const logNameField = {
    name: 'name',
    type: STRING,
    displayName: 'Log Name'
};

export const levelField = {
    name: 'level',
    type: STRING,
    displayName: 'Override'
};

export const defaultLevelField = {
    name: 'defaultLevel',
    type: STRING,
    displayName: 'Initial'
};

export const effectiveLevelField = {
    name: 'effectiveLevel',
    type: STRING,
    displayName: 'Effective'
};

export const logFileField = {
    name: 'filename',
    type: STRING,
    displayName: 'Log File'
};

//-----------------------
// Columns
//-----------------------
export const logNameCol = {
    field: logNameField,
    width: 400
};

export const levelCol = {
    field: levelField,
    width: 110
};

export const defaultLevelCol = {
    field: defaultLevelField,
    width: 110
};

export const effectiveLevelCol = {
    field: effectiveLevelField,
    width: 110
};

export const logFileCol = {
    field: logFileField,
    minWidth: 160,
    flex: true
};