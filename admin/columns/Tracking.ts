/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {badgeCol, badgeRenderer} from '@xh/hoist/admin/columns';
import {RangeAggregator} from '@xh/hoist/admin/tabs/activity/aggregators/RangeAggregator';
import * as Col from '@xh/hoist/cmp/grid/columns';
import {ColumnSpec} from '@xh/hoist/cmp/grid/columns';
import {TrackSeverity} from '@xh/hoist/core';
import {fmtDate, fmtSpan, numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {ReactElement} from 'react';

const autosizeMaxWidth = 400;

export const appBuild: ColumnSpec = {
    field: {
        name: 'appBuild',
        displayName: 'App Build',
        type: 'string'
    },
    headerName: 'Build',
    chooserGroup: 'Client App / Browser',
    width: 120
};

export const appEnvironment: ColumnSpec = {
    field: {
        name: 'appEnvironment',
        type: 'string',
        displayName: 'Environment'
    },
    chooserGroup: 'Core Data',
    width: 130
};

export const appVersion: ColumnSpec = {
    field: {
        name: 'appVersion',
        displayName: 'App Version',
        type: 'string'
    },
    headerName: 'Version',
    chooserGroup: 'Client App / Browser',
    width: 120
};

export const browser: ColumnSpec = {
    field: {
        name: 'browser',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    chooserGroup: 'Client App / Browser',
    width: 100
};

export const category: ColumnSpec = {
    field: {
        name: 'category',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    chooserGroup: 'Core Data',
    width: 100
};

export const correlationId: ColumnSpec = {
    field: {
        name: 'correlationId',
        type: 'string',
        displayName: 'Correlation ID'
    },
    chooserGroup: 'Core Data',
    renderer: badgeRenderer,
    width: 180,
    autosizeBufferPx: 20
};

export const data: ColumnSpec = {
    field: {name: 'data', type: 'json'},
    chooserGroup: 'Core Data',
    width: 250,
    autosizeMaxWidth
};

export const day: ColumnSpec = {
    field: {
        name: 'day',
        type: 'localDate',
        isDimension: true
    },
    ...Col.localDate,
    chooserGroup: 'Core Data',
    displayName: 'App Day'
};

export const dayRange: ColumnSpec = {
    field: {
        name: 'dayRange',
        type: 'json',
        aggregator: new RangeAggregator(),
        displayName: 'App Day Range'
    },
    chooserGroup: 'Core Data',
    align: 'right',
    width: 200,
    renderer: dayRangeRenderer,
    exportValue: dayRangeRenderer,
    comparator: dayRangeComparator
};

export const device: ColumnSpec = {
    field: {
        name: 'device',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    chooserGroup: 'Client App / Browser',
    width: 100
};

export const deviceIcon: ColumnSpec = {
    field: device.field,
    chooserGroup: 'Client App / Browser',
    headerName: Icon.desktop(),
    headerTooltip: 'Device',
    tooltip: true,
    resizable: false,
    align: 'center',
    width: 50,
    renderer: v => {
        // See Hoist Core `Device.groovy` for enumeration
        switch (v) {
            case 'ANDROID':
            case 'IPAD':
            case 'IPHONE':
            case 'IPOD':
                return Icon.mobile();
            case 'LINUX':
            case 'MAC':
            case 'WINDOWS':
                return Icon.desktop();
            default:
                return Icon.questionCircle();
        }
    }
};

export const elapsedRenderer = numberRenderer({
    label: 'ms',
    nullDisplay: '-',
    formatConfig: {thousandSeparated: false, mantissa: 0}
});

export const elapsed: ColumnSpec = {
    field: {
        name: 'elapsed',
        type: 'int',
        aggregator: 'AVG'
    },
    chooserGroup: 'Core Data',
    width: 130,
    renderer: elapsedRenderer
};

export const elapsedMax: ColumnSpec = {
    field: {
        name: 'elapsedMax',
        type: 'int',
        aggregator: 'MAX'
    },
    chooserGroup: 'Core Data',
    width: 130,
    renderer: elapsedRenderer
};

export const entryCount: ColumnSpec = {
    field: {
        name: 'entryCount',
        type: 'int',
        displayName: 'Entries',
        aggregator: 'LEAF_COUNT'
    },
    chooserGroup: 'Core Data',
    width: 80,
    align: 'right'
};

export const entryId: ColumnSpec = {
    field: {
        name: 'id',
        type: 'int',
        displayName: 'Entry ID'
    },
    chooserGroup: 'Core Data',
    width: 100,
    align: 'right'
};

export const error: ColumnSpec = {
    field: {
        name: 'error',
        type: 'string'
    },
    chooserGroup: 'Errors',
    width: 250,
    autosizeMaxWidth,
    renderer: e => fmtSpan(e, {className: 'xh-font-family-mono xh-font-size-small'})
};

export const errorMessage: ColumnSpec = {
    field: {
        name: 'errorMessage',
        type: 'string'
    },
    chooserGroup: 'Errors',
    width: 250,
    autosizeMaxWidth
};

export const errorName: ColumnSpec = {
    field: {
        name: 'errorName',
        type: 'string',
        isDimension: true
    },
    chooserGroup: 'Errors',
    width: 150,
    autosizeMaxWidth
};

export const instance: ColumnSpec = {
    field: {
        name: 'instance',
        displayName: 'Server',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    chooserDescription:
        'The unique ID of the back-end Hoist cluster member instance to which the client app is connected.',
    chooserGroup: 'Session IDs',
    renderer: badgeRenderer,
    width: 100
};

export const loadId: ColumnSpec = {
    field: {
        name: 'loadId',
        type: 'string'
    },
    chooserDescription:
        'A unique ID assigned to each load/init of the application. Refreshing the tab within your browser will result in a new Load ID.',
    chooserGroup: 'Session IDs',
    ...badgeCol
};

export const msg: ColumnSpec = {
    field: {
        name: 'msg',
        type: 'string',
        displayName: 'Message',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    chooserGroup: 'Core Data',
    width: 250,
    autosizeMaxWidth
};

export const severity: ColumnSpec = {
    field: {
        name: 'severity',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    chooserGroup: 'Core Data',
    width: 80
};

export const severityIcon: ColumnSpec = {
    field: severity.field,
    headerName: Icon.info(),
    headerTooltip: 'Severity',
    tooltip: true,
    resizable: false,
    align: 'center',
    width: 50,
    renderer: v => getSeverityIcon(v)
};

export function getSeverityIcon(severity: TrackSeverity): ReactElement {
    if (!severity) return null;

    switch (severity) {
        case 'DEBUG':
            return Icon.code();
        case 'INFO':
            return Icon.infoCircle({className: 'xh-text-color-muted'});
        case 'WARN':
            return Icon.warning({intent: 'warning'});
        case 'ERROR':
            return Icon.error({intent: 'danger'});
        default:
            return Icon.questionCircle();
    }
}

export const tabId: ColumnSpec = {
    field: {
        name: 'tabId',
        type: 'string'
    },
    chooserDescription:
        'A new Tab ID is established within browser session storage and maintained for the lifetime of the tab. Refreshing the app within your browser will maintain the existing Tab ID',
    chooserGroup: 'Session IDs',
    ...badgeCol
};

export const url: ColumnSpec = {
    field: {
        name: 'url',
        type: 'string',
        displayName: 'URL'
    },
    chooserGroup: 'Client App / Browser',
    width: 250,
    autosizeMaxWidth
};

export const urlPathOnly: ColumnSpec = {
    field: url.field,
    chooserGroup: 'Client App / Browser',
    width: 250,
    autosizeMaxWidth,
    tooltip: true,
    renderer: v => {
        if (!v) return null;
        try {
            const urlObj = new URL(v);
            return urlObj.pathname;
        } catch (ignored) {
            return v;
        }
    }
};

export const userAgent: ColumnSpec = {
    field: {
        name: 'userAgent',
        type: 'string',
        isDimension: true,
        aggregator: 'UNIQUE'
    },
    chooserGroup: 'Client App / Browser',
    width: 130,
    autosizeMaxWidth
};

export const userAlertedFlag: ColumnSpec = {
    field: {name: 'userAlerted', type: 'bool'},
    headerName: Icon.window(),
    headerTooltip:
        'Indicates if the user was shown an interactive alert when this error was triggered.',
    chooserGroup: 'Errors',
    resizable: false,
    align: 'center',
    width: 50,
    exportName: 'User Alerted?',
    renderer: v => (v ? Icon.window() : null)
};

export const userMessageFlag: ColumnSpec = {
    field: {name: 'userMessage', type: 'string'},
    headerName: Icon.comment(),
    headerTooltip:
        'Indicates if the user provided a message along with the automated error report.',
    chooserGroup: 'Errors',
    excludeFromExport: true,
    resizable: false,
    align: 'center',
    width: 50,
    renderer: v => (v ? Icon.comment() : null)
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
