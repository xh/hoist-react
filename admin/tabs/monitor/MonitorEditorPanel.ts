/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {restGrid, RestGridConfig} from '@xh/hoist/desktop/cmp/rest';
import * as Col from '@xh/hoist/admin/columns';
import * as MCol from './MonitorColumns';
import {App} from '@xh/hoist/admin/AppModel';

export const monitorEditorPanel = hoistCmp.factory(
    () => restGrid({modelConfig: {...modelSpec, readonly: App.readonly}})
);

const required = true,
    hidden = true;

const modelSpec: RestGridConfig= {
    persistWith: {localStorageKey: 'xhAdminMonitorState'},
    colChooserModel: true,
    enableExport: true,
    store: {
        url: 'rest/monitorAdmin',
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {...MCol.code.field as FieldSpec, required},
            MCol.metricUnit.field,
            MCol.warnThreshold.field,
            MCol.failThreshold.field,
            MCol.sortOrder.field,

            {...Col.name.field as FieldSpec, required},
            Col.notes.field,
            {...Col.active.field as FieldSpec, defaultValue: true, required},
            {...Col.lastUpdated.field as FieldSpec, editable: false},
            {...Col.lastUpdatedBy.field as FieldSpec, editable: false},

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
