/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import * as Col from '@xh/hoist/cmp/grid/columns';

const {STRING, BOOL} = FieldType;

export const user = {
    field: {name: 'user', type: STRING},
    width: 250
};

export const username = {
    field: {
        name: 'username',
        type: STRING,
        displayName: 'User',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 160
};

export const email = {
    field: {name: 'email', type: STRING},
    width: 200
};

export const displayName = {
    field: {name: 'displayName', type: STRING},
    width: 200
};

export const roles = {
    field: {name: 'roles', type: STRING},
    minWidth: 130,
    flex: true,
    tooltip: true
};

export const impersonating = {
    field: {name: 'impersonating', type: STRING},
    width: 140
};

export const impersonatingFlag = {
    field: {name: 'impersonatingFlag', type: BOOL},
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
};

export const active = {
    field: {name: 'active', type: BOOL},
    ...Col.boolCheck,
    width: 70
};
