/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import * as Col from '@xh/hoist/admin/columns';
import * as LogLevelCol from './LogLevelColumns';

export const logLevelPanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminLogLevelState'},
    colChooserModel: true,
    enableExport: true,
    store: {
        url: 'rest/logLevelAdmin',
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {...LogLevelCol.logName.field, required: true},
            {...LogLevelCol.level.field, lookupName: 'levels'},
            {...LogLevelCol.defaultLevel.field, editable: false},
            {...LogLevelCol.effectiveLevel.field, editable: false},
            {...Col.lastUpdated.field, editable: false},
            {...Col.lastUpdatedBy.field, editable: false}
        ]
    },
    unit: 'log level',
    filterFields: ['name'],
    columns: [
        LogLevelCol.logName,
        LogLevelCol.defaultLevel,
        LogLevelCol.level,
        LogLevelCol.effectiveLevel,
        Col.lastUpdated,
        Col.lastUpdatedBy
    ],
    editors: [
        {field: 'name'},
        {field: 'level'},
        {field: 'lastUpdated'},
        {field: 'lastUpdatedBy'}
    ]
};

