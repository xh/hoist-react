/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import * as Col from '@xh/hoist/admin/columns';
import * as MCol from './MonitorColumns';

export const monitorEditorPanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const required = true,
    hidden = true;

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminMonitorState'},
    colChooserModel: true,
    enableExport: true,
    store: {
        url: 'rest/monitorAdmin',
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {...MCol.code.field, required},
            {...MCol.metricUnit.field},
            {...MCol.warnThreshold.field},
            {...MCol.failThreshold.field},
            {...MCol.sortOrder.field},

            {...Col.name.field, required},
            {...Col.notes.field},
            {...Col.active.field, defaultValue: true, required},
            {...Col.lastUpdated.field, editable: false},
            {...Col.lastUpdatedBy.field, editable: false},

            {name: 'metricType', type: 'string', lookupName: 'metricTypes', required},
            {name: 'params', type: 'json'}
        ]
    },
    unit: 'monitor',
    sortBy: 'sortOrder',
    filterFields: ['code', 'name'],
    columns: [
        {...Col.active},
        {...MCol.code},
        {...Col.name},
        {...MCol.warnThreshold},
        {...MCol.failThreshold},
        {...MCol.metricUnit},
        {...Col.notes},
        {...Col.lastUpdatedBy, hidden},
        {...Col.lastUpdated, hidden},
        {...MCol.sortOrder}
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
