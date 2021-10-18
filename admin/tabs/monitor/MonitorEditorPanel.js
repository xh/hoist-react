/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {boolCheckCol, dateTimeCol, numberCol} from '@xh/hoist/cmp/grid';
import {hoistCmp} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';

export const monitorEditorPanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminMonitorState'},
    colChooserModel: true,
    enableExport: true,
    store: {
        url: 'rest/monitorAdmin',
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {
                name: 'code',
                type: 'string',
                required: true
            },
            {
                name: 'name',
                type: 'string',
                required: true
            },
            {
                name: 'metricType',
                type: 'string',
                lookupName: 'metricTypes',
                required: true
            },
            {
                name: 'metricUnit',
                type: 'string'
            },
            {
                name: 'warnThreshold',
                type: 'int'
            },
            {
                name: 'failThreshold',
                type: 'int'
            },
            {
                name: 'params',
                type: 'json'
            },
            {
                name: 'notes',
                type: 'string'
            },
            {
                name: 'active',
                type: 'bool',
                defaultValue: true,
                required: true
            },
            {
                name: 'sortOrder',
                type: 'int'
            },
            {
                name: 'lastUpdated',
                type: 'date',
                editable: false
            },
            {
                name: 'lastUpdatedBy',
                type: 'string',
                editable: false
            }
        ]
    },
    unit: 'monitor',
    sortBy: 'sortOrder',
    filterFields: ['code', 'name'],
    columns: [
        {field: 'active', ...boolCheckCol, width: 70},
        {field: 'code', width: 150},
        {field: 'name', width: 200},
        {field: 'warnThreshold', ...numberCol, headerName: 'Warn', width: 130},
        {field: 'failThreshold', ...numberCol, headerName: 'Fail', width: 130},
        {field: 'metricUnit', headerName: 'Units', width: 100},
        {field: 'notes', minWidth: 70, flex: true},
        {field: 'lastUpdatedBy', width: 160, hidden: true},
        {field: 'lastUpdated', ...dateTimeCol, hidden: true},
        {field: 'sortOrder', ...numberCol, headerName: 'Sort', width: 100}
    ],
    editors: [
        {field: 'code'},
        {field: 'name'},
        {field: 'metricType'},
        {field: 'warnThreshold'},
        {field: 'failThreshold'},
        {field: 'metricUnit'},
        {field: 'params'},
        {field: 'notes', formField: {item: textArea()}},
        {field: 'active'},
        {field: 'sortOrder'},
        {field: 'lastUpdated'},
        {field: 'lastUpdatedBy'}
    ]
};
