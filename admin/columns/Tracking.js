/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {localDateCol} from '@xh/hoist/cmp/grid';
import {RangeAggregator} from '@xh/hoist/admin/tabs/activity/aggregators/RangeAggregator';
import {Icon} from '@xh/hoist/icon';
import {fmtDate, fmtSpan, numberRenderer} from '@xh/hoist/format';
import {isFinite} from 'lodash';

const {BOOL, INT, JSON, LOCAL_DATE, STRING} = FieldType;

//-----------------------
// Fields
//-----------------------
export const appEnvironmentField = {
    name: 'appEnvironment',
    type: STRING,
    displayName: 'Environment'
};

export const appVersionField = {
    name: 'appVersion',
    type: STRING
};

export const browserField = {
    name: 'browser',
    type: STRING,
    isDimension: true,
    aggregator: 'UNIQUE'
};

export const categoryField = {
    name: 'category',
    type: STRING,
    isDimension: true,
    aggregator: 'UNIQUE'
};

export const countField = {
    name: 'count',
    type: INT,
    aggregator: 'CHILD_COUNT'
};

export const dataField = {
    name: 'data',
    type: JSON
};

export const dayField = {
    name: 'day',
    type: LOCAL_DATE,
    isDimension: true,
    aggregator: new RangeAggregator()
};

export const deviceField = {
    name: 'device',
    type: STRING,
    isDimension: true,
    aggregator: 'UNIQUE'
};

export const elapsedField = {
    name: 'elapsed',
    type: INT,
    aggregator: 'AVG'
};

export const entryCountField = {
    name: 'entryCount',
    type: INT,
    displayName: 'Entries',
    aggregator: 'LEAF_COUNT'
};

export const entryIdField = {
    name: 'id',
    type: INT,
    displayName: 'Entry ID'
};

export const errorField = {
    name: 'error',
    type: STRING,
    displayName: 'Error Details'
};

export const monthField = {
    name: 'month',
    type: STRING,
    isDimension: true,
    aggregator: 'UNIQUE'
};

export const msgField = {
    name: 'msg',
    type: STRING,
    displayName: 'Message',
    isDimension: true,
    aggregator: 'UNIQUE'
};

export const urlField = {
    name: 'url',
    type: STRING,
    displayName: 'URL'
};

export const userAgentField = {
    name: 'userAgent',
    type: STRING,
    isDimension: true,
    aggregator: 'UNIQUE'
};

export const userAlertedFlagField = {
    name: 'userAlerted',
    type: BOOL
};

export const userMessageFlagField = {
    name: 'userMessageFlag',
    type: BOOL
};

export const dateRangeField = {
    name: 'day',
    type: JSON,
    displayName: 'App Day'
};

//-----------------------
// Columns
//-----------------------
export const appEnvironmentCol = {
    field: appEnvironmentField,
    width: 130
};

export const appVersionCol = {
    field: appVersionField,
    width: 130
};

export const browserCol = {
    field: browserField,
    width: 100
};

export const categoryCol = {
    field: categoryField,
    width: 100
};

export const dataCol = {
    field: dataField,
    flex: true,
    minWidth: 120,
    autosizeMaxWidth: 400
};

export const dayCol = {
    field: dayField,
    ...localDateCol,
    displayName: 'App Day'
};

export const deviceCol = {
    field: deviceField,
    width: 100
};

export const elapsedCol = {
    field: elapsedField,
    width: 130,
    align: 'right',
    renderer: numberRenderer({
        label: 'ms',
        nullDisplay: '-',
        formatConfig: {thousandSeparated: false, mantissa: 0}
    })
};

export const entryCountCol = {
    field: entryCountField,
    width: 80,
    align: 'right'
};

export const entryIdCol = {
    field: entryIdField,
    width: 100,
    align: 'right'
};

export const errorCol = {
    field: errorField,
    flex: true,
    minWidth: 150,
    renderer: (e) => fmtSpan(e, {className: 'xh-font-family-mono xh-font-size-small'})
};

export const msgCol = {
    field: msgField,
    minWidth: 120,
    autosizeMaxWidth: 400,
    flex: true
};

export const urlCol = {
    field: urlField,
    width: 250
};

export const userAgentCol = {
    field: userAgentField,
    width: 130
};

export const userAlertedFlagCol = {
    field: userAlertedFlagField,
    headerName: Icon.window(),
    headerTooltip: 'Indicates if the user was shown an interactive alert when this error was triggered.',
    resizable: false,
    align: 'center',
    width: 50,
    exportName: 'User Alerted?',
    renderer: v => v ? Icon.window({asHtml: true}) : ''
};

export const userMessageFlagCol = {
    field: userMessageFlagField,
    headerName: Icon.comment(),
    headerTooltip: 'Indicates if the user provided a message along with the automated error report.',
    excludeFromExport: true,
    resizable: false,
    align: 'center',
    width: 50,
    renderer: (v, {record}) => {
        const {msg} = record.data;
        return msg ? Icon.comment({asHtml: true}) : '';
    }
};

export const dateRangeCol = {
    field: dateRangeField,
    ...localDateCol,
    width: 200,
    renderer: dateRangeRenderer,
    exportValue: dateRangeRenderer,
    comparator: dateRangeComparator
};

function dateRangeRenderer(range) {
    if (!range) return;
    if (isFinite(range)) return fmtDate(range);

    const {min, max} = range,
        minStr = fmtDate(min),
        maxStr = fmtDate(max);

    if (minStr === maxStr) return minStr;
    return `${minStr} → ${maxStr}`;
}

function dateRangeComparator(rangeA, rangeB, sortDir, abs, {defaultComparator}) {
    const maxA = rangeA?.max,
        maxB = rangeB?.max;

    return defaultComparator(maxA, maxB);
}