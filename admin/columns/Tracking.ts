/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {RangeAggregator} from '@xh/hoist/admin/tabs/activity/aggregators/RangeAggregator';
import {Icon} from '@xh/hoist/icon';
import {fmtDate, fmtSpan, numberRenderer} from '@xh/hoist/format';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {isFinite} from 'lodash';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';

export const appEnvironment = {
    field: {
        name: 'appEnvironment',
        type: 'string',
        displayName: 'Environment'
    },
    width: 130
} as ColumnSpec;

export const appVersion = {
    field: {name: 'appVersion', type: 'string'},
    width: 130
} as ColumnSpec;

export const browser = {
    field: {
        name: 'browser',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 100
} as ColumnSpec;

export const category = {
    field: {
        name: 'category',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 100
} as ColumnSpec;

export const data = {
    field: {name: 'data', type: 'json'},
    flex: true,
    minWidth: 120,
    autosizeMaxWidth: 400
} as ColumnSpec;

export const day = {
    field: {
        name: 'day',
        type: 'localDate',
        isDimension: true,
        aggregator: new RangeAggregator()
    },
    ...Col.localDate,
    displayName: 'App Day'
} as ColumnSpec;

export const device = {
    field: {
        name: 'device',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 100
} as ColumnSpec;

export const elapsed = {
    field: {
        name: 'elapsed',
        type: 'int',
        aggregator: 'AVG'
    },
    width: 130,
    align: 'right',
    renderer: numberRenderer({
        label: 'ms',
        nullDisplay: '-',
        formatConfig: {thousandSeparated: false, mantissa: 0}
    })
} as ColumnSpec;

export const entryCount = {
    field: {
        name: 'entryCount',
        type: 'int',
        displayName: 'Entries',
        aggregator: 'LEAF_COUNT'
    },
    width: 80,
    align: 'right'
} as ColumnSpec;

export const entryId = {
    field: {
        name: 'id',
        type: 'int',
        displayName: 'Entry ID'
    },
    width: 100,
    align: 'right'
} as ColumnSpec;

export const error = {
    field: {
        name: 'error',
        type: 'string',
        displayName: 'Error Details'
    },
    flex: true,
    minWidth: 150,
    renderer: (e) => fmtSpan(e, {className: 'xh-font-family-mono xh-font-size-small'})
} as ColumnSpec;

export const msg = {
    field: {
        name: 'msg',
        type: 'string',
        displayName: 'Message',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    minWidth: 120,
    autosizeMaxWidth: 400,
    flex: true
} as ColumnSpec;

export const url = {
    field: {
        name: 'url',
        type: 'string',
        displayName: 'URL'
    },
    width: 250,
    autosizeMaxWidth: 400
} as ColumnSpec;

export const userAgent = {
    field: {
        name: 'userAgent',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 130
} as ColumnSpec;

export const userAlertedFlag = {
    field: {name: 'userAlerted', type: 'bool'},
    headerName: Icon.window(),
    headerTooltip: 'Indicates if the user was shown an interactive alert when this error was triggered.',
    resizable: false,
    align: 'center',
    width: 50,
    exportName: 'User Alerted?',
    renderer: v => v ? Icon.window() : null
} as ColumnSpec;

export const userMessageFlag = {
    field: {name: 'userMessageFlag', type: 'bool'},
    headerName: Icon.comment(),
    headerTooltip: 'Indicates if the user provided a message along with the automated error report.',
    excludeFromExport: true,
    resizable: false,
    align: 'center',
    width: 50,
    renderer: (v, {record}) => {
        const {msg} = record.data;
        return msg ? Icon.comment() : null;
    }
} as ColumnSpec;

export const dateRange = {
    field: {
        name: 'day',
        type: 'json',
        displayName: 'App Day'
    },
    ...Col.localDate,
    width: 200,
    renderer: dateRangeRenderer,
    exportValue: dateRangeRenderer,
    comparator: dateRangeComparator
} as ColumnSpec;

//-----------------------
// Implementation
//-----------------------
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
