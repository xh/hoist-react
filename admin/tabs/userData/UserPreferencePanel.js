/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {
    groupNameCol,
    lastUpdatedByCol,
    lastUpdatedCol,
    nameCol,
    typeCol,
    usernameCol,
    userValueCol
} from '@xh/hoist/admin/columns';

export const userPreferencePanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

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
            {
                name: 'name',
                type: 'string',
                displayName: 'Pref',
                lookupName: 'names',
                editable: 'onAdd',
                required: true
            },
            {
                name: 'groupName',
                type: 'string',
                displayName: 'Group',
                lookupName: 'groupNames',
                editable: false
            },
            {
                name: 'type',
                type: 'string',
                editable: false
            },
            {
                name: 'username',
                type: 'string',
                displayName: 'User',
                required: true
            },
            {
                name: 'userValue',
                typeField: 'type',
                required: true
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
    sortBy: 'name',
    groupBy: 'groupName',
    unit: 'preference',
    filterFields: ['name', 'username'],
    columns: [
        {...nameCol},
        {...typeCol},
        {...usernameCol},
        {...groupNameCol, hidden: true},
        {...userValueCol},
        {...lastUpdatedByCol, hidden: true},
        {...lastUpdatedCol, hidden: true}
    ],
    editors: [
        {field: 'name'},
        {field: 'username'},
        {field: 'userValue'},
        {field: 'lastUpdated'},
        {field: 'lastUpdatedBy'}
    ]
};
