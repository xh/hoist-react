/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {fmtDateTime} from '@xh/hoist/format';
import * as Col from '@xh/hoist/cmp/grid/columns';

const {BOOL, AUTO, JSON, STRING} = FieldType;

export const owner = {
    field: {name: 'owner', type: STRING},
    width: 200
};

export const token = {
    field: {name: 'token', type: STRING},
    width: 100
};

export const meta = {
    field: {name: 'meta', type: JSON},
    width: 200
};

export const acl = {
    field: {
        name: 'acl',
        type: STRING,
        displayName: 'ACL'
    },
    width: 80
};

export const archived = {
    field: {name: 'archived', type: BOOL},
    ...Col.boolCheck,
    width: 100
};

export const archivedDate = {
    field: {name: 'archivedDate', type: AUTO},
    ...Col.dateTime,
    renderer: archivedDateRenderer
};

export function archivedDateRenderer(v) {
    return v > 0 ? fmtDateTime(v) : '-';
}