/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid';

export const logName: ColumnSpec = {
    field: {
        name: 'name',
        type: 'string',
        displayName: 'Log Name'
    },
    width: 400
};

export const level: ColumnSpec = {
    field: {
        name: 'level',
        type: 'string',
        displayName: 'Override'
    },
    width: 110
};

export const defaultLevel: ColumnSpec = {
    field: {
        name: 'defaultLevel',
        type: 'string',
        displayName: 'Initial'
    },
    width: 110
};

export const effectiveLevel: ColumnSpec = {
    field: {
        name: 'effectiveLevel',
        type: 'string',
        displayName: 'Effective'
    },
    width: 110
};
