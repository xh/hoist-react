/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';
import {Icon} from '@xh/hoist/icon';
import * as Col from '@xh/hoist/cmp/grid/columns';

export const user: ColumnSpec = {
    field: {name: 'user', type: 'string'},
    width: 250
};

export const username: ColumnSpec = {
    field: {
        name: 'username',
        type: 'string',
        displayName: 'User',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 160
};

export const email: ColumnSpec = {
    field: {name: 'email', type: 'string'},
    width: 200
};

export const displayName: ColumnSpec = {
    field: {name: 'displayName', type: 'string'},
    width: 200
};

export const roles: ColumnSpec = {
    field: {name: 'roles', type: 'string'},
    minWidth: 130,
    flex: true,
    tooltip: true
};

export const impersonating: ColumnSpec = {
    field: {name: 'impersonating', type: 'string'},
    width: 140
};

export const impersonatingFlag: ColumnSpec = {
    field: {name: 'impersonatingFlag', type: 'bool'},
    headerName: Icon.impersonate(),
    headerTooltip: 'Indicates if the user was impersonating another user during tracked activity.',
    excludeFromExport: true,
    resizable: false,
    align: 'center',
    width: 50,
    renderer: (v, {record}) => {
        const {impersonating} = record.data;
        return impersonating
            ? Icon.impersonate({
                  className: 'xh-text-color-accent',
                  title: `Impersonating ${impersonating}`
              })
            : null;
    }
};

export const active: ColumnSpec = {
    field: {name: 'active', type: 'bool'},
    ...Col.boolCheck,
    width: 70
};
