/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';

export const logLevelPanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminLogLevelState'},
    colChooserModel: true,
    enableExport: true,
    store: {
        url: 'rest/logLevelAdmin',
        fields: [
            {
                name: 'name',
                displayName: 'Log Name',
                required: true
            },
            {
                name: 'level',
                displayName: 'Override',
                lookupName: 'levels'
            },
            {
                name: 'defaultLevel',
                displayName: 'Initial',
                editable: false
            },
            {
                name: 'effectiveLevel',
                displayName: 'Effective',
                editable: false
            }
        ]
    },
    unit: 'log level',
    filterFields: ['name'],
    columns: [
        {field: 'name', width: 400},
        {field: 'defaultLevel', width: 110},
        {field: 'level', width: 110},
        {field: 'effectiveLevel', width: 110}
    ],
    editors: [
        {field: 'name'},
        {field: 'level'}
    ]
};

