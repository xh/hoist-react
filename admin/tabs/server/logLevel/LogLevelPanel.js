/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {
    defaultLevelCol,
    defaultLevelField,
    effectiveLevelCol,
    effectiveLevelField,
    levelCol,
    levelField,
    logNameCol,
    logNameField
} from '@xh/hoist/admin/columns';

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
            {...logNameField, required: true},
            {...levelField, lookupName: 'levels'},
            {...defaultLevelField, editable: false},
            {...effectiveLevelField, editable: false}
        ]
    },
    unit: 'log level',
    filterFields: ['name'],
    columns: [
        logNameCol,
        defaultLevelCol,
        levelCol,
        effectiveLevelCol
    ],
    editors: [
        {field: 'name'},
        {field: 'level'}
    ]
};

