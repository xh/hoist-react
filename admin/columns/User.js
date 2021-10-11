/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';

const {STRING, BOOL} = FieldType;

//-----------------------
// Fields
//-----------------------
export const userField = {
    name: 'user',
    type: STRING
};

export const usernameField = {
    name: 'username',
    type: STRING,
    displayName: 'User',
    isDimension: true,
    aggregator: 'UNIQUE'
};

export const emailField = {
    name: 'email',
    type: STRING
};

export const displayNameField = {
    name: 'displayName',
    type: STRING
};

export const rolesField = {
    name: 'roles',
    type: STRING
};

export const impersonatingField = {
    name: 'impersonating',
    type: STRING
};

export const impersonatingFlagField = {
    name: 'impersonatingFlag',
    type: BOOL
};

export const authUserField = {
    name: 'authUser',
    type: STRING
};

export const apparentUserField = {
    name: 'apparentUser',
    type: STRING
};

//-----------------------
// Columns
//-----------------------
export const userCol = {
    field: userField,
    width: 250
};

export const usernameCol = {
    field: usernameField,
    width: 160
};

export const emailCol = {
    field: emailField,
    width: 200
};

export const displayNameCol = {
    field: displayNameField,
    width: 200
};

export const rolesCol = {
    field: rolesField,
    minWidth: 130,
    flex: true,
    tooltip: true
};

export const impersonatingCol = {
    field: impersonatingField,
    width: 140
};

export const impersonatingFlagCol = {
    field: impersonatingFlagField,
    headerName: Icon.impersonate(),
    headerTooltip: 'Indicates if the user was impersonating another user during tracked activity.',
    excludeFromExport: true,
    resizable: false,
    align: 'center',
    width: 50,
    renderer: (v, {record}) => {
        const {impersonating} = record.data;
        return impersonating ?
            Icon.impersonate({
                asHtml: true,
                className: 'xh-text-color-accent',
                title: `Impersonating ${impersonating}`
            }) : '';
    }
};

export const authUserCol = {
    field: authUserField,
    width: 250
};

export const apparentUserCol = {
    field: apparentUserField,
    width: 250
};
