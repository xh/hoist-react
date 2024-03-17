/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {hoistCmp} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {restGrid, RestGridConfig} from '@xh/hoist/desktop/cmp/rest';

export const userPreferencePanel = hoistCmp.factory(() =>
    restGrid({modelConfig: {...modelSpec, readonly: AppModel.readonly}})
);

const required = true,
    hidden = true;

const modelSpec: RestGridConfig = {
    persistWith: {localStorageKey: 'xhAdminUserPreferenceState'},
    colChooserModel: true,
    enableExport: true,
    exportOptions: {filename: exportFilenameWithDate('user-prefs')},
    selModel: 'multiple',
    store: {
        url: 'rest/userPreferenceAdmin',
        reloadLookupsOnLoad: true,
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {
                ...(Col.name.field as FieldSpec),
                displayName: 'Pref',
                lookupName: 'names',
                editable: 'onAdd',
                required
            },
            {...(Col.groupName.field as FieldSpec), lookupName: 'groupNames', editable: false},
            {...(Col.type.field as FieldSpec), editable: false},
            {...(Col.username.field as FieldSpec), required},
            {...(Col.userValue.field as FieldSpec), typeField: 'type', required},
            {...(Col.lastUpdated.field as FieldSpec), editable: false},
            {...(Col.lastUpdatedBy.field as FieldSpec), editable: false}
        ]
    },
    sortBy: 'name',
    groupBy: 'groupName',
    unit: 'preference',
    filterFields: ['name', 'username'],
    columns: [
        {...Col.name},
        {...Col.type},
        {...Col.username},
        {...Col.groupName, hidden},
        {...Col.userValue},
        {...Col.lastUpdatedBy, hidden},
        {...Col.lastUpdated, hidden}
    ],
    editors: [
        {field: 'name'},
        {field: 'username'},
        {field: 'userValue'},
        {field: 'lastUpdated'},
        {field: 'lastUpdatedBy'}
    ]
};
