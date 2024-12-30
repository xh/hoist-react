/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import * as Col from '@xh/hoist/cmp/grid/columns';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';

export const metricUnit: ColumnSpec = {
    field: {name: 'metricUnit', type: 'string'},
    headerName: 'Units',
    width: 100
};

export const warnThreshold: ColumnSpec = {
    field: {name: 'warnThreshold', type: 'int'},
    ...Col.number,
    headerName: 'Warn',
    width: 130
};

export const failThreshold: ColumnSpec = {
    field: {name: 'failThreshold', type: 'int'},
    ...Col.number,
    headerName: 'Fail',
    width: 130
};

export const sortOrder: ColumnSpec = {
    field: {name: 'sortOrder', type: 'int'},
    ...Col.number,
    headerName: 'Sort',
    width: 100
};

export const code: ColumnSpec = {
    field: {name: 'code', type: 'string'},
    width: 150
};

export const primaryOnly: ColumnSpec = {
    field: {name: 'primaryOnly', type: 'bool'},
    headerName: 'P.Only',
    headerTooltip: 'Primary Only',
    ...Col.boolCheck,
    width: 70
};
