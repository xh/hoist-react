/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {fmtDateTime} from '@xh/hoist/format';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';

export const owner = {
    field: {name: 'owner', type: 'string'},
    width: 200
} as ColumnSpec;

export const token = {
    field: {name: 'token', type: 'string'},
    width: 100
} as ColumnSpec;

export const meta = {
    field: {name: 'meta', type: 'json'},
    width: 200
} as ColumnSpec;

export const acl = {
    field: {
        name: 'acl',
        type: 'string',
        displayName: 'ACL'
    },
    width: 80
} as ColumnSpec;

export const archived = {
    field: {name: 'archived', type: 'bool'},
    ...Col.boolCheck,
    width: 100
} as ColumnSpec;

export const archivedDate = {
    field: {name: 'archivedDate', type: 'auto'},
    ...Col.dateTime,
    renderer: archivedDateRenderer
} as ColumnSpec;

export function archivedDateRenderer(v) {
    return v > 0 ? fmtDateTime(v) : '-';
}
