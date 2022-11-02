/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid';

export const logName = {
    field: {
        name: 'name',
        type: 'string',
        displayName: 'Log Name'
    },
    width: 400
} as ColumnSpec;

export const level = {
    field: {
        name: 'level',
        type: 'string',
        displayName: 'Override'
    },
    width: 110
} as ColumnSpec;

export const defaultLevel = {
    field: {
        name: 'defaultLevel',
        type: 'string',
        displayName: 'Initial'
    },
    width: 110
} as ColumnSpec;

export const effectiveLevel = {
    field: {
        name: 'effectiveLevel',
        type: 'string',
        displayName: 'Effective'
    },
    width: 110
} as ColumnSpec;
