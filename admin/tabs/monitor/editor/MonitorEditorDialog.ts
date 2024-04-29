/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {MonitorTabModel} from '@xh/hoist/admin/tabs/monitor/MonitorTabModel';
import {filler} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {restGrid, RestGridConfig} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';
import * as MCol from '../MonitorColumns';

export const monitorEditorDialog = hoistCmp.factory<MonitorTabModel>(({model}) =>
    dialog({
        title: 'Configure Status Monitors',
        icon: Icon.gear(),
        className: 'xh-admin-app__editor-dialog',
        isOpen: model.showEditorDialog,
        canOutsideClickClose: false,
        onClose: () => (model.showEditorDialog = false),
        item: panel({
            item: restGrid({modelConfig: {...modelSpec, readonly: AppModel.readonly}}),
            bbar: [
                filler(),
                button({
                    text: 'Close',
                    icon: Icon.close(),
                    onClick: () => (model.showEditorDialog = false)
                })
            ]
        })
    })
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
            {...(MCol.primaryOnly.field as FieldSpec), defaultValue: false, required},

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
        {...MCol.primaryOnly},
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
        {field: 'primaryOnly'},
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
            let ret = 'Are you sure you want to delete the selected monitors?';

            const xhMonitors = monitors.filter(m => m.get('code').startsWith('xh'));
            if (!isEmpty(xhMonitors)) {
                ret +=
                    ` The following monitor(s) are provided by Hoist and will be recreated automatically on the next application restart: ${xhMonitors.map(m => m.get('name')).join(', ')}. ` +
                    'Deactivate these monitors instead of deleting them to persistently disable.';
            }
            return ret;
        }
    }
};
