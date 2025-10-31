/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {dateTimeRenderer} from '@xh/hoist/format';

export const dateCreated: ColumnSpec = {
    field: {name: 'dateCreated', type: 'date'},
    ...Col.dateTime
};

export const dateCreatedNoYear: ColumnSpec = {
    ...Col.dateTimeSec,
    field: {name: 'dateCreated', type: 'date'},
    tooltip: true,
    align: 'right',
    renderer: dateTimeRenderer({fmt: 'MMM DD HH:mm:ss'})
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
