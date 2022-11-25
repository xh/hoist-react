/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';
import {Icon} from '@xh/hoist/icon';
import * as Col from '@xh/hoist/cmp/grid/columns';

export const user = {
    field: {name: 'user', type: 'string'},
    width: 250
} as ColumnSpec;

export const username = {
    field: {
        name: 'username',
        type: 'string',
        displayName: 'User',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 160
} as ColumnSpec;

export const email = {
    field: {name: 'email', type: 'string'},
    width: 200
} as ColumnSpec;

export const displayName = {
    field: {name: 'displayName', type: 'string'},
    width: 200
} as ColumnSpec;

export const roles = {
    field: {name: 'roles', type: 'string'},
    minWidth: 130,
    flex: true,
    tooltip: true
} as ColumnSpec;

export const impersonating = {
    field: {name: 'impersonating', type: 'string'},
    width: 140
} as ColumnSpec;

export const impersonatingFlag = {
    field: {name: 'impersonatingFlag', type: 'bool'},
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
                className: 'xh-text-color-accent',
                title: `Impersonating ${impersonating}`
            }) : null;
    }
} as ColumnSpec;

export const active = {
    field: {name: 'active', type: 'bool'},
    ...Col.boolCheck,
    width: 70
} as ColumnSpec;
