/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {RangeAggregator} from '@xh/hoist/admin/tabs/activity/aggregators/RangeAggregator';
import {badge} from '@xh/hoist/cmp/badge';
import {XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {fmtDate, fmtSpan, numberRenderer} from '@xh/hoist/format';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';
import copy from 'clipboard-copy';

export const appEnvironment: ColumnSpec = {
    field: {
        name: 'appEnvironment',
        type: 'string',
        displayName: 'Environment'
    },
    width: 130
};

export const appVersion: ColumnSpec = {
    field: {name: 'appVersion', type: 'string'},
    width: 130
};

export const browser: ColumnSpec = {
    field: {
        name: 'browser',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 100
};

export const severity: ColumnSpec = {
    field: {
        name: 'severity',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 80
};

export const category: ColumnSpec = {
    field: {
        name: 'category',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 100
};

export const data: ColumnSpec = {
    field: {name: 'data', type: 'json'},
    width: 250,
    autosizeMaxWidth: 400
};

export const day: ColumnSpec = {
    field: {
        name: 'day',
        type: 'localDate',
        isDimension: true
    },
    ...Col.localDate,
    displayName: 'App Day'
};

export const device: ColumnSpec = {
    field: {
        name: 'device',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 100
};

export const elapsed: ColumnSpec = {
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
};

export const entryCount: ColumnSpec = {
    field: {
        name: 'entryCount',
        type: 'int',
        displayName: 'Entries',
        aggregator: 'LEAF_COUNT'
    },
    width: 80,
    align: 'right'
};

export const entryId: ColumnSpec = {
    field: {
        name: 'id',
        type: 'int',
        displayName: 'Entry ID'
    },
    width: 100,
    align: 'right'
};

export const correlationId: ColumnSpec = {
    field: {
        name: 'correlationId',
        type: 'string',
        displayName: 'Correlation ID'
    },
    renderer: badgeRenderer,
    width: 100
};

export const error: ColumnSpec = {
    field: {
        name: 'error',
        type: 'string'
    },
    width: 250,
    autosizeMaxWidth: 400,
    renderer: e => fmtSpan(e, {className: 'xh-font-family-mono xh-font-size-small'})
};

export const msg: ColumnSpec = {
    field: {
        name: 'msg',
        type: 'string',
        displayName: 'Message',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 250,
    autosizeMaxWidth: 400
};

export const url: ColumnSpec = {
    field: {
        name: 'url',
        type: 'string',
        displayName: 'URL'
    },
    width: 250,
    autosizeMaxWidth: 400
};

export const instance: ColumnSpec = {
    field: {
        name: 'instance',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    renderer: badgeRenderer,
    width: 100
};

export const userAgent: ColumnSpec = {
    field: {
        name: 'userAgent',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    width: 130
};

export const userAlertedFlag: ColumnSpec = {
    field: {name: 'userAlerted', type: 'bool'},
    headerName: Icon.window(),
    headerTooltip:
        'Indicates if the user was shown an interactive alert when this error was triggered.',
    resizable: false,
    align: 'center',
    width: 50,
    exportName: 'User Alerted?',
    renderer: v => (v ? Icon.window() : null)
};

export const userMessageFlag: ColumnSpec = {
    field: {name: 'userMessageFlag', type: 'bool'},
    headerName: Icon.comment(),
    headerTooltip:
        'Indicates if the user provided a message along with the automated error report.',
    excludeFromExport: true,
    resizable: false,
    align: 'center',
    width: 50,
    renderer: (v, {record}) => {
        const {msg} = record.data;
        return msg ? Icon.comment() : null;
    }
};

export const dayRange: ColumnSpec = {
    field: {
        name: 'dayRange',
        type: 'json',
        aggregator: new RangeAggregator(),
        displayName: 'App Day Range'
    },
    align: 'right',
    width: 200,
    renderer: dayRangeRenderer,
    exportValue: dayRangeRenderer,
    comparator: dayRangeComparator
};

//-----------------------
// Implementation
//-----------------------
function dayRangeRenderer(range) {
    if (!range) return null;

    const {min, max} = range,
        minStr = fmtDate(min),
        maxStr = fmtDate(max);

    if (minStr === maxStr) return minStr;
    return `${minStr} → ${maxStr}`;
}

function dayRangeComparator(rangeA, rangeB, sortDir, abs, {defaultComparator}) {
    const maxA = rangeA?.max,
        maxB = rangeB?.max;

    return defaultComparator(maxA, maxB);
}

function badgeRenderer(v) {
    return v
        ? badge({
              item: v,
              className: 'xh-font-family-mono',
              style: {cursor: 'copy'},
              title: 'Double-click to copy',
              onDoubleClick: () => {
                  copy(v);
                  XH.toast({
                      icon: Icon.copy(),
                      message: `Copied ${v}`
                  });
              }
          })
        : '-';
}
