/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import * as Col from '@xh/hoist/admin/columns';
import * as MonitorCol from './MonitorColumns';

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
            {...MonitorCol.code.field, required: true},
            {...MonitorCol.metricUnit.field},
            {...MonitorCol.warnThreshold.field},
            {...MonitorCol.failThreshold.field},
            {...MonitorCol.sortOrder.field},

            {...Col.name.field, required: true},
            {...Col.notes.field},
            {...Col.active.field, defaultValue: true, required: true},
            {...Col.lastUpdated.field, editable: false},
            {...Col.lastUpdatedBy.field, editable: false},

            {name: 'metricType', type: 'string', lookupName: 'metricTypes', required: true},
            {name: 'params', type: 'json'}
        ]
    },
    unit: 'monitor',
    sortBy: 'sortOrder',
    filterFields: ['code', 'name'],
    columns: [
        {...Col.active},
        {...MonitorCol.code},
        {...Col.name},
        {...MonitorCol.warnThreshold},
        {...MonitorCol.failThreshold},
        {...MonitorCol.metricUnit},
        {...Col.notes},
        {...Col.lastUpdatedBy, hidden: true},
        {...Col.lastUpdated, hidden: true},
        {...MonitorCol.sortOrder}
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
