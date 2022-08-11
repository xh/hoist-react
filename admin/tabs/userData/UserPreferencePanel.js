/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import * as Col from '@xh/hoist/admin/columns';

export const userPreferencePanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const required = true,
    hidden = true;

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminUserPreferenceState'},
    colChooserModel: true,
    enableExport: true,
    selModel: 'multiple',
    store: {
        url: 'rest/userPreferenceAdmin',
        reloadLookupsOnLoad: true,
        fieldDefaults: {disableXssProtection: true},
        fields: [
            {...Col.name.field, displayName: 'Pref', lookupName: 'names', editable: 'onAdd', required},
            {...Col.groupName.field, lookupName: 'groupNames', editable: false},
            {...Col.type.field, editable: false},
            {...Col.username.field, required},
            {...Col.userValue.field, typeField: 'type', required},
            {...Col.lastUpdated.field, editable: false},
            {...Col.lastUpdatedBy.field, editable: false}
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
