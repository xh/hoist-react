/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {numberRenderer} from '@xh/hoist/format';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';

const mbCol = {width: 150, renderer: numberRenderer({precision: 2, withCommas: true})},
    pctCol = {width: 150, renderer: numberRenderer({precision: 2, withCommas: true, label: '%'})};

export const metricUnit = {
    field: {name: 'metricUnit', type: 'string'},
    headerName: 'Units',
    width: 100
} as ColumnSpec;

export const warnThreshold = {
    field: {name: 'warnThreshold', type: 'int'},
    ...Col.number,
    headerName: 'Warn',
    width: 130
} as ColumnSpec;

export const failThreshold = {
    field: {name: 'failThreshold', type: 'int'},
    ...Col.number,
    headerName: 'Fail',
    width: 130
} as ColumnSpec;

export const sortOrder = {
    field: {name: 'sortOrder', type: 'int'},
    ...Col.number,
    headerName: 'Sort',
    width: 100
} as ColumnSpec;

export const code = {
    field: {name: 'code', type: 'string'},
    width: 150
} as ColumnSpec;

export const timestamp = {
    field: {name: 'timestamp', type: 'date'},
    ...Col.dateTime
} as ColumnSpec;

export const totalHeapMb = {
    field: {
        name: 'totalHeapMb',
        type: 'number',
        displayName: 'Total (mb)'
    },
    ...mbCol
} as ColumnSpec;

export const maxHeapMb = {
    field: {
        name: 'maxHeapMb',
        type: 'number',
        displayName: 'Max (mb)'
    },
    ...mbCol
} as ColumnSpec;

export const freeHeapMb = {
    field: {
        name: 'freeHeapMb',
        type: 'number',
        displayName: 'Free (mb)'
    },
    ...mbCol
} as ColumnSpec;

export const usedHeapMb = {
    field: {
        name: 'usedHeapMb',
        type: 'number',
        displayName: 'Used (mb)'
    },
    ...mbCol
} as ColumnSpec;

export const usedPctTotal = {
    field: {
        name: 'usedPctTotal',
        type: 'number',
        displayName: 'Used (pct Total)'
    },
    ...pctCol
} as ColumnSpec;
