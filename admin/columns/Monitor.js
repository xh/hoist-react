/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {boolCheckCol, dateTimeCol, numberCol} from '@xh/hoist/cmp/grid';
import {numberRenderer} from '@xh/hoist/format';

const {BOOL, DATE, INT, NUMBER, JSON, STRING} = FieldType;

//-----------------------
// Fields
//-----------------------
export const metricTypeField = {
    name: 'metricType',
    type: STRING
};

export const metricUnitField = {
    name: 'metricUnit',
    type: STRING
};

export const warnThresholdField = {
    name: 'warnThreshold',
    type: INT
};

export const failThresholdField = {
    name: 'failThreshold',
    type: INT
};

export const paramsField = {
    name: 'params',
    type: JSON
};

export const activeField = {
    name: 'active',
    type: BOOL
};

export const sortOrderField = {
    name: 'sortOrder',
    type: INT
};

export const codeField = {
    name: 'code',
    type: STRING
};

export const totalHeapMbField = {
    name: 'totalHeapMb',
    type: NUMBER,
    displayName: 'Total (mb)'
};

export const maxHeapMbField = {
    name: 'maxHeapMb',
    type: NUMBER,
    displayName: 'Max (mb)'
};

export const freeHeapMbField = {
    name: 'freeHeapMb',
    type: NUMBER,
    displayName: 'Free (mb)'
};
export const usedHeapMbField = {
    name: 'usedHeapMb',
    type: NUMBER,
    displayName: 'Used (mb)'
};

export const usedPctTotalField = {
    name: 'usedPctTotal',
    type: NUMBER,
    displayName: 'Used (pct Total)'
};

export const timestampField = {
    name: 'timestamp',
    type: DATE
};

//-----------------------
// Columns
//-----------------------
const mbCol = {align: 'right', width: 150, renderer: numberRenderer({precision: 2, useCommas: true})},
    pctCol = {align: 'right', width: 150, renderer: numberRenderer({precision: 2, useCommas: true, label: '%'})};

export const metricUnitCol = {
    field: metricUnitField,
    headerName: 'Units',
    width: 100
};

export const warnThresholdCol = {
    field: warnThresholdField,
    ...numberCol,
    headerName: 'Warn',
    width: 130
};

export const failThresholdCol = {
    field: failThresholdField,
    ...numberCol,
    headerName: 'Fail',
    width: 130
};

export const activeCol = {
    field: activeField,
    ...boolCheckCol,
    width: 70
};

export const sortOrderCol = {
    field: sortOrderField,
    ...numberCol,
    headerName: 'Sort',
    width: 100
};

export const codeCol = {
    field: codeField,
    width: 150
};

export const timestampCol = {
    field: timestampField,
    ...dateTimeCol
};

export const totalHeapMbCol = {
    field: totalHeapMbField,
    ...mbCol
};

export const maxHeapMbCol = {
    field: maxHeapMbField,
    ...mbCol
};

export const freeHeapMbCol = {
    field: freeHeapMbField,
    ...mbCol
};

export const usedHeapMbCol = {
    field: usedHeapMbField,
    ...mbCol
};

export const usedPctTotalCol = {
    field: usedPctTotalField,
    ...pctCol
};