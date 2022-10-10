/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {FieldType} from '@xh/hoist/data';
import {RangeAggregator} from '@xh/hoist/admin/tabs/activity/aggregators/RangeAggregator';
import {Icon} from '@xh/hoist/icon';
import {fmtDate, fmtSpan, numberRenderer} from '@xh/hoist/format';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {isFinite} from 'lodash';

const {BOOL, INT, JSON, LOCAL_DATE, STRING} = FieldType;

export const appEnvironment = {
    field: {
        name: 'appEnvironment',
        type: STRING,
        displayName: 'Environment'
    },
    width: 130
};

export const appVersion = {
    field: {name: 'appVersion', type: STRING},
    width: 130
};

export const browser = {
    field: {
        name: 'browser',
        type: STRING,
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 100
};

export const category = {
    field: {
        name: 'category',
        type: STRING,
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 100
};

export const data = {
    field: {name: 'data', type: JSON},
    flex: true,
    minWidth: 120,
    autosizeMaxWidth: 400
};

export const day = {
    field: {
        name: 'day',
        type: LOCAL_DATE,
        isDimension: true,
        aggregator: new RangeAggregator()
    },
    ...Col.localDate,
    displayName: 'App Day'
};

export const device = {
    field: {
        name: 'device',
        type: STRING,
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 100
};

export const elapsed = {
    field: {
        name: 'elapsed',
        type: INT,
        aggregator: 'AVG'
    },
    width: 130,
    align: 'right',
    renderer: numberRenderer({
        label: 'ms',
        nullDisplay: '-',
        formatConfig: {thousandSeparated: false, mantissa: 0}
    })
};

export const entryCount = {
    field: {
        name: 'entryCount',
        type: INT,
        displayName: 'Entries',
        aggregator: 'LEAF_COUNT'
    },
    width: 80,
    align: 'right'
};

export const entryId = {
    field: {
        name: 'id',
        type: INT,
        displayName: 'Entry ID'
    },
    width: 100,
    align: 'right'
};

export const error = {
    field: {
        name: 'error',
        type: STRING,
        displayName: 'Error Details'
    },
    flex: true,
    minWidth: 150,
    renderer: (e) => fmtSpan(e, {className: 'xh-font-family-mono xh-font-size-small'})
};

export const msg = {
    field: {
        name: 'msg',
        type: STRING,
        displayName: 'Message',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    minWidth: 120,
    autosizeMaxWidth: 400,
    flex: true
};

export const url = {
    field: {
        name: 'url',
        type: STRING,
        displayName: 'URL'
    },
    width: 250,
    autosizeMaxWidth: 400
};

export const userAgent = {
    field: {
        name: 'userAgent',
        type: STRING,
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 130
};

export const userAlertedFlag = {
    field: {name: 'userAlerted', type: BOOL},
    headerName: Icon.window(),
    headerTooltip: 'Indicates if the user was shown an interactive alert when this error was triggered.',
    resizable: false,
    align: 'center',
    width: 50,
    exportName: 'User Alerted?',
    renderer: v => v ? Icon.window() : null
};

export const userMessageFlag = {
    field: {name: 'userMessageFlag', type: BOOL},
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
};

export const dateRange = {
    field: {
        name: 'day',
        type: JSON,
        displayName: 'App Day'
    },
    ...Col.localDate,
    width: 200,
    renderer: dateRangeRenderer,
    exportValue: dateRangeRenderer,
    comparator: dateRangeComparator
};

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
