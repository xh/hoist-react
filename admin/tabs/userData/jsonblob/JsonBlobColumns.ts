/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {fmtDateTime} from '@xh/hoist/format';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';

export const owner: ColumnSpec = {
    field: {name: 'owner', type: 'string'},
    width: 200
};

export const token: ColumnSpec = {
    field: {name: 'token', type: 'string'},
    width: 100
};

export const meta: ColumnSpec = {
    field: {name: 'meta', type: 'json'},
    width: 200
};

export const acl: ColumnSpec = {
    field: {
        name: 'acl',
        type: 'string',
        displayName: 'ACL'
    },
    width: 80
};

export const archived: ColumnSpec = {
    field: {name: 'archived', type: 'bool'},
    ...Col.boolCheck,
    width: 100
};

export const archivedDate: ColumnSpec = {
    field: {name: 'archivedDate', type: 'auto'},
    ...Col.dateTime,
    renderer: archivedDateRenderer
};

export function archivedDateRenderer(v) {
    return v > 0 ? fmtDateTime(v) : '-';
}
