/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid';

export const name: ColumnSpec = {
    field: {name: 'name', type: 'string'},
    width: 200
};

export const type: ColumnSpec = {
    field: {name: 'type', type: 'string'},
    width: 100
};

export const description: ColumnSpec = {
    field: {name: 'description', type: 'string'},
    flex: true,
    minWidth: 200
};

export const notes: ColumnSpec = {
    field: {name: 'notes', type: 'string'},
    minWidth: 60,
    flex: true,
    tooltip: true
};

export const note: ColumnSpec = {
    field: {
        name: 'note',
        type: 'string',
        displayName: 'Notes'
    },
    minWidth: 60,
    flex: true,
    tooltip: true
};
