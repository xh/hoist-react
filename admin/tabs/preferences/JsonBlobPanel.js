/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {truncate} from 'lodash';

export const jsonBlobPanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminJsonBlobState'},
    enableColChooser: true,
    enableExport: true,
    store: {
        url: 'rest/jsonBlobAdmin',
        reloadLookupsOnLoad: true,
        fields: [
            {
                name: 'username',
                displayName: 'User',
                required: true
            },
            {
                name: 'name',
                required: true
            },
            {
                name: 'type',
                lookupName: 'types',
                required: true,
                enableCreate: true
            },
            {
                name: 'value',
                type: 'json'
            },
            {
                name: 'description'
            },
            {
                name: 'dateCreated',
                type: 'date',
                editable: false
            },
            {
                name: 'lastUpdated',
                type: 'date',
                editable: false
            }
        ]
    },
    sortBy: ['username', 'name'],
    groupBy: 'type',
    unit: 'blob',
    filterFields: ['name', 'username', 'type', 'value', 'description'],
    columns: [
        {field: 'username', width: 200},
        {field: 'name', width: 200},
        {field: 'type', width: 200},
        {field: 'description', width: 200},
        {field: 'value', flex: 1, renderer: v => truncate(v, {length: 500})}
    ],
    editors: [
        {field: 'username'},
        {field: 'name'},
        {field: 'type'},
        {field: 'description', formField: {item: textArea()}},
        {field: 'value'},
        {field: 'dateCreated'},
        {field: 'lastUpdated'}
    ]
};
