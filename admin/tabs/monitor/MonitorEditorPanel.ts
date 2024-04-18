/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {restGrid, RestGridConfig} from '@xh/hoist/desktop/cmp/rest';
import * as Col from '@xh/hoist/admin/columns';
import * as MCol from './MonitorColumns';
import {AppModel} from '@xh/hoist/admin/AppModel';

export const monitorEditorPanel = hoistCmp.factory(() =>
    restGrid({modelConfig: {...modelSpec, readonly: AppModel.readonly}})
);

const required = true,
    hidden = true;

const modelSpec: RestGridConfig = {
    persistWith: {localStorageKey: 'xhAdminMonitorState'},
    colChooserModel: true,
    enableExport: true,
    store: {
        url: 'rest/monitorAdmin',
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {...(MCol.code.field as FieldSpec), required},
            MCol.metricUnit.field,
            MCol.warnThreshold.field,
            MCol.failThreshold.field,
            MCol.sortOrder.field,
            {...(MCol.masterOnly.field as FieldSpec), defaultValue: true, required},

            {...(Col.name.field as FieldSpec), required},
            Col.notes.field,
            {...(Col.active.field as FieldSpec), defaultValue: true, required},
            {...(Col.lastUpdated.field as FieldSpec), editable: false},
            {...(Col.lastUpdatedBy.field as FieldSpec), editable: false},

            {name: 'metricType', type: 'string', lookupName: 'metricTypes', required},
            {name: 'params', type: 'json'}
        ]
    },
    unit: 'monitor',
    sortBy: 'sortOrder',
    filterFields: ['code', 'name'],
    columns: [
        {...Col.active},
        {...MCol.masterOnly},
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
        {field: 'masterOnly'},
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
    ],
    actionWarning: {
        del: monitors => {
            const xhMonitors = monitors.filter(m => m.get('code').startsWith('xh'));
            if (xhMonitors.length > 0) {
                return (
                    `The following monitor(s) is/are provided by Hoist: ${xhMonitors.map(m => m.get('name')).join(', ')}. ` +
                    'These monitors will reappear on the next application restart. Consider deactivating them instead.'
                );
            }
        }
    }
};
