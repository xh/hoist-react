/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid';

export const name = {
    field: {name: 'name', type: 'string'},
    width: 200
} as ColumnSpec;

export const type = {
    field: {name: 'type', type: 'string'},
    width: 100
} as ColumnSpec;

export const description = {
    field: {name: 'description', type: 'string'},
    flex: true,
    minWidth: 200
} as ColumnSpec;

export const notes = {
    field: {name: 'notes', type: 'string'},
    minWidth: 60,
    flex: true,
    tooltip: true
} as ColumnSpec;

export const note = {
    field: {
        name: 'note',
        type: 'string',
        displayName: 'Notes'
    },
    minWidth: 60,
    flex: true,
    tooltip: true
} as ColumnSpec;
