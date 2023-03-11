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

export const timestamp: ColumnSpec = {
    field: {name: 'timestamp', type: 'date'},
    ...Col.dateTime
};

export const totalHeapMb: ColumnSpec = {
    field: {
        name: 'totalHeapMb',
        type: 'number',
        displayName: 'Total (mb)'
    },
    ...mbCol
};

export const maxHeapMb: ColumnSpec = {
    field: {
        name: 'maxHeapMb',
        type: 'number',
        displayName: 'Max (mb)'
    },
    ...mbCol
};

export const freeHeapMb: ColumnSpec = {
    field: {
        name: 'freeHeapMb',
        type: 'number',
        displayName: 'Free (mb)'
    },
    ...mbCol
};

export const usedHeapMb: ColumnSpec = {
    field: {
        name: 'usedHeapMb',
        type: 'number',
        displayName: 'Used (mb)'
    },
    ...mbCol
};

export const usedPctTotal: ColumnSpec = {
    field: {
        name: 'usedPctTotal',
        type: 'number',
        displayName: 'Used (pct Total)'
    },
    ...pctCol
};
