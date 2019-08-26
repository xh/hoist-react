/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent, useLocalModel} from '@xh/hoist/core';
import {restGrid, RestGridModel, RestStore} from '@xh/hoist/desktop/cmp/rest';
import {usernameCol} from '@xh/hoist/admin/columns';

export const UserPreferencePanel = hoistComponent(() => {
    const model = useLocalModel(createModel);
    return restGrid({model});
});

function createModel() {
    return new RestGridModel({
        stateModel: 'xhUserPreferenceGrid',
        enableColChooser: true,
        enableExport: true,
        store: new RestStore({
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
        }),
        sortBy: 'name',
        groupBy: 'groupName',
        unit: 'preference',
        filterFields: ['name', 'username'],
        columns: [
            {field: 'name', width: 200},
            {field: 'type', width: 100},
            {field: 'username', ...usernameCol},
            {field: 'groupName', hidden: true},
            {field: 'userValue', minWidth: 200, flex: true}
        ],
        editors: [
            {field: 'name'},
            {field: 'username'},
            {field: 'userValue'},
            {field: 'lastUpdated'},
            {field: 'lastUpdatedBy'}
        ]
    });
}