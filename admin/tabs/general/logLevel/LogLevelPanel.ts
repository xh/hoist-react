/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {hoistCmp} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {restGrid, RestGridConfig} from '@xh/hoist/desktop/cmp/rest';
import * as LogLevelCol from './LogLevelColumns';

export const logLevelPanel = hoistCmp.factory(() =>
    restGrid({modelConfig: {...modelSpec, readonly: AppModel.readonly}})
);

const modelSpec: RestGridConfig = {
    printSupport: true,
    persistWith: {localStorageKey: 'xhAdminLogLevelState'},
    colChooserModel: true,
    enableExport: true,
    exportOptions: {filename: exportFilenameWithDate('log-levels')},
    store: {
        url: 'rest/logLevelAdmin',
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {...(LogLevelCol.logName.field as FieldSpec), required: true},
            {...(LogLevelCol.level.field as FieldSpec), lookupName: 'levels'},
            {...(LogLevelCol.defaultLevel.field as FieldSpec), editable: false},
            {...(LogLevelCol.effectiveLevel.field as FieldSpec), editable: false},
            {...(Col.lastUpdated.field as FieldSpec), editable: false},
            {...(Col.lastUpdatedBy.field as FieldSpec), editable: false}
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
    editors: [{field: 'name'}, {field: 'level'}, {field: 'lastUpdated'}, {field: 'lastUpdatedBy'}]
};
