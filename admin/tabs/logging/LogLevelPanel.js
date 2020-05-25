/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';

export const logLevelPanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const modelSpec = {
    persistWith: 'xhLogLevelGrid',
    enableColChooser: true,
    enableExport: true,
    store: {
        url: 'rest/logLevelAdmin',
        fields: [
            {
                name: 'name',
                label: 'Log Name',
                required: true
            },
            {
                name: 'level',
                label: 'Override',
                lookupName: 'levels'
            },
            {
                name: 'defaultLevel',
                label: 'Initial',
                editable: false
            },
            {
                name: 'effectiveLevel',
                label: 'Effective',
                editable: false
            }
        ]
    },
    unit: 'log level',
    filterFields: ['name'],
    columns: [
        {field: 'name', width: 400},
        {field: 'defaultLevel', headerName: 'Initial', width: 110},
        {field: 'level', headerName: 'Override', width: 110},
        {field: 'effectiveLevel', headerName: 'Effective', width: 110}
    ],
    editors: [
        {field: 'name'},
        {field: 'level'}
    ]
};

