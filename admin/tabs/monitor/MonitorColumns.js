/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {numberRenderer} from '@xh/hoist/format';
import * as Col from '@xh/hoist/cmp/grid/columns';

const {DATE, INT, NUMBER, STRING} = FieldType;

const mbCol = {width: 150, renderer: numberRenderer({precision: 2, useCommas: true})},
    pctCol = {width: 150, renderer: numberRenderer({precision: 2, useCommas: true, label: '%'})};

export const metricUnit = {
    field: {name: 'metricUnit', type: STRING},
    headerName: 'Units',
    width: 100
};

export const warnThreshold = {
    field: {name: 'warnThreshold', type: INT},
    ...Col.number,
    headerName: 'Warn',
    width: 130
};

export const failThreshold = {
    field: {name: 'failThreshold', type: INT},
    ...Col.number,
    headerName: 'Fail',
    width: 130
};

export const sortOrder = {
    field: {name: 'sortOrder', type: INT},
    ...Col.number,
    headerName: 'Sort',
    width: 100
};

export const code = {
    field: {name: 'code', type: STRING},
    width: 150
};

export const timestamp = {
    field: {name: 'timestamp', type: DATE},
    ...Col.dateTime
};

export const totalHeapMb = {
    field: {
        name: 'totalHeapMb',
        type: NUMBER,
        displayName: 'Total (mb)'
    },
    ...mbCol
};

export const maxHeapMb = {
    field: {
        name: 'maxHeapMb',
        type: NUMBER,
        displayName: 'Max (mb)'
    },
    ...mbCol
};

export const freeHeapMb = {
    field: {
        name: 'freeHeapMb',
        type: NUMBER,
        displayName: 'Free (mb)'
    },
    ...mbCol
};

export const usedHeapMb = {
    field: {
        name: 'usedHeapMb',
        type: NUMBER,
        displayName: 'Used (mb)'
    },
    ...mbCol
};

export const usedPctTotal = {
    field: {
        name: 'usedPctTotal',
        type: NUMBER,
        displayName: 'Used (pct Total)'
    },
    ...pctCol
};
