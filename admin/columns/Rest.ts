/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';
import * as Col from '@xh/hoist/cmp/grid/columns';

export const dateCreated = {
    field: {name: 'dateCreated', type: 'date'},
    ...Col.dateTime
} as ColumnSpec;

export const dateCreatedWithSec = {
    field: {name: 'dateCreated', type: 'date'},
    ...Col.dateTimeSec
} as ColumnSpec;

export const lastUpdated = {
    field: {name: 'lastUpdated', type: 'date'},
    ...Col.dateTime
} as ColumnSpec;

export const lastUpdatedBy = {
    field: {name: 'lastUpdatedBy', type: 'string'},
    width: 160
} as ColumnSpec;
