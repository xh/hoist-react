/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';
import * as Col from '@xh/hoist/cmp/grid/columns';

export const dateCreated: ColumnSpec = {
    field: {name: 'dateCreated', type: 'date'},
    ...Col.dateTime
};

export const dateCreatedWithSec: ColumnSpec = {
    field: {name: 'dateCreated', type: 'date'},
    ...Col.dateTimeSec
};

export const lastUpdated: ColumnSpec = {
    field: {name: 'lastUpdated', type: 'date'},
    ...Col.dateTime
};

export const lastUpdatedBy: ColumnSpec = {
    field: {name: 'lastUpdatedBy', type: 'string'},
    width: 160
};
