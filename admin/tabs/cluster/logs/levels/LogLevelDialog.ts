/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {LogViewerModel} from '@xh/hoist/admin/tabs/cluster/logs/LogViewerModel';
import {filler, span} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {button} from '@xh/hoist/desktop/cmp/button';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {restGrid, RestGridConfig} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';

export const logLevelDialog = hoistCmp.factory<LogViewerModel>(({model}) =>
    dialog({
        title: 'Configure Log Levels',
        icon: Icon.gear(),
        className: 'xh-admin-app__editor-dialog',
        isOpen: model.showLogLevelDialog,
        canOutsideClickClose: false,
        onClose: () => (model.showLogLevelDialog = false),
        item: panel({
            item: restGrid({modelConfig: {...modelSpec, readonly: AppModel.readonly}}),
            bbar: [
                Icon.infoCircle(),
                span('Note - log level adjustments apply to all instances in the cluster'),
                filler(),
                button({
                    text: 'Close',
                    icon: Icon.close(),
                    onClick: () => (model.showLogLevelDialog = false)
                })
            ]
        })
    })
);

const modelSpec: RestGridConfig = {
    persistWith: {localStorageKey: 'xhAdminLogLevelState'},
    colChooserModel: true,
    enableExport: true,
    exportOptions: {filename: exportFilenameWithDate('log-levels')},
    store: {
        url: 'rest/logLevelAdmin',
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {
                name: 'name',
                type: 'string',
                displayName: 'Package/Class',
                required: true
            },
            {name: 'level', type: 'string', displayName: 'Override', lookupName: 'levels'},
            {name: 'defaultLevel', type: 'string', displayName: 'Initial', editable: false},
            {name: 'effectiveLevel', type: 'string', displayName: 'Effective', editable: false},
            {...(Col.lastUpdated.field as FieldSpec), editable: false},
            {...(Col.lastUpdatedBy.field as FieldSpec), editable: false}
        ]
    },
    unit: 'log level',
    filterFields: ['name'],
    columns: [
        {field: 'name', width: 400},
        {field: 'defaultLevel', width: 110},
        {field: 'level', width: 110},
        {field: 'effectiveLevel', width: 110},
        Col.lastUpdated,
        Col.lastUpdatedBy
    ],
    editors: [
        {
            field: 'name',
            formField: {
                item: textInput({placeholder: 'com.myapp.MyClassWithLogging (or partial path)'})
            }
        },
        {
            field: 'level',
            formField: {
                info: 'Hint - clear to leave at default while keeping record in place to adjust again later.'
            }
        },
        {field: 'lastUpdated'},
        {field: 'lastUpdatedBy'}
    ]
};
