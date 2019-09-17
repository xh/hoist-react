/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {boolCheckCol, numberCol} from '@xh/hoist/cmp/grid';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {textArea} from '@xh/hoist/desktop/cmp/input';

export const MonitorEditorPanel = hoistCmp(
    () => restGrid({model: modelSpec})
);

const modelSpec = {
    stateModel: 'xhMonitorEditorGrid',
    enableColChooser: true,
    enableExport: true,
    store: {
        url: 'rest/monitorAdmin',
        fields: [
            {
                name: 'code',
                required: true
            },
            {
                name: 'name',
                required: true
            },
            {
                name: 'metricType',
                lookupName: 'metricTypes',
                required: true
            },
            {
                name: 'metricUnit'
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
                name: 'notes'
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
