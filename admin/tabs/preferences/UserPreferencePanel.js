/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {truncate} from 'lodash';
import {usernameCol} from '@xh/hoist/admin/columns';
import {dateTimeCol} from '@xh/hoist/cmp/grid';
import {hoistCmp} from '@xh/hoist/core';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {
    addAction,
    bulkDeleteAction,
    editAction
} from '@xh/hoist/desktop/cmp/rest';

export const userPreferencePanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminUserPreferenceState'},
    enableColChooser: true,
    enableExport: true,
    selModel: 'multiple',
    store: {
        url: 'rest/userPreferenceAdmin',
        reloadLookupsOnLoad: true,
        fields: [
            {
                name: 'name',
                label: 'Pref',
                lookupName: 'names',
                editable: 'onAdd',
                required: true
            },
            {
                name: 'groupName',
                label: 'Group',
                lookupName: 'groupNames',
                editable: false
            },
            {
                name: 'type',
                editable: false
            },
            {
                name: 'username',
                label: 'User',
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
                editable: false
            }
        ]
    },
    sortBy: 'name',
    groupBy: 'groupName',
    unit: 'preference',
    filterFields: ['name', 'username'],
    toolbarActions: [
        addAction,
        editAction,
        bulkDeleteAction
    ],
    menuActions: [
        addAction,
        editAction,
        bulkDeleteAction
    ],
    columns: [
        {field: 'name', width: 200},
        {field: 'type', width: 100},
        {field: 'username', ...usernameCol},
        {field: 'groupName', hidden: true},
        {field: 'userValue', minWidth: 200, flex: true, renderer: truncateIfJson},
        {field: 'lastUpdatedBy', width: 160, hidden: true},
        {field: 'lastUpdated', ...dateTimeCol, hidden: true}
    ],
    editors: [
        {field: 'name'},
        {field: 'username'},
        {field: 'userValue'},
        {field: 'lastUpdated'},
        {field: 'lastUpdatedBy'}
    ]
};

function truncateIfJson(userValue, {record}) {
    return record.data.type === 'json' ? truncate(userValue, {length: 500}) : userValue;
}