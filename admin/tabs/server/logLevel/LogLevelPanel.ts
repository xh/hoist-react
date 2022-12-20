/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {restGrid, RestGridConfig} from '@xh/hoist/desktop/cmp/rest';
import * as Col from '@xh/hoist/admin/columns';
import * as LogLevelCol from './LogLevelColumns';
import {AppModel} from '@xh/hoist/admin/AppModel';


export const logLevelPanel = hoistCmp.factory(
    () => restGrid({modelConfig: {...modelSpec, readonly: AppModel.instance.readonly}})
);

const modelSpec: RestGridConfig= {
    persistWith: {localStorageKey: 'xhAdminLogLevelState'},
    colChooserModel: true,
    enableExport: true,
    store: {
        url: 'rest/logLevelAdmin',
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {...LogLevelCol.logName.field as FieldSpec, required: true},
            {...LogLevelCol.level.field as FieldSpec, lookupName: 'levels'},
            {...LogLevelCol.defaultLevel.field as FieldSpec, editable: false},
            {...LogLevelCol.effectiveLevel.field as FieldSpec, editable: false},
            {...Col.lastUpdated.field as FieldSpec, editable: false},
            {...Col.lastUpdatedBy.field as FieldSpec, editable: false}
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

