/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {dateTimeCol} from '@xh/hoist/cmp/grid';
import {truncate} from 'lodash';

export const jsonBlobPanel = hoistCmp.factory(
    () => restGrid({model: modelSpec})
);

const modelSpec = {
    persistWith: {localStorageKey: 'xhAdminJsonBlobState'},
    colChooserModel: true,
    enableExport: true,
    store: {
        url: 'rest/jsonBlobAdmin',
        reloadLookupsOnLoad: true,
        fields: [
            {
                name: 'owner',
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
            },
            {
                name: 'valueLastUpdated',
                type: 'date',
                editable: false
            },
            {
                name: 'lastUpdatedBy',
                editable: false
            }
        ]
    },
    sortBy: ['owner', 'name'],
    groupBy: 'type',
    unit: 'blob',
    filterFields: ['name', 'owner', 'type', 'value', 'description'],
    columns: [
        {field: 'owner', width: 200},
        {field: 'name', width: 200},
        {field: 'type', width: 200},
        {field: 'description', width: 200},
        {field: 'value', flex: 1, renderer: v => truncate(v, {length: 500})},
        {field: 'dateCreated', ...dateTimeCol, hidden: true},
        {field: 'lastUpdated', ...dateTimeCol, hidden: true},
        {field: 'valueLastUpdated', ...dateTimeCol, hidden: true},
        {field: 'lastUpdatedBy', width: 160, hidden: true}
    ],
    editors: [
        {field: 'owner'},
        {field: 'name'},
        {field: 'type'},
        {field: 'description', formField: {item: textArea()}},
        {field: 'value'},
        {field: 'dateCreated'},
        {field: 'lastUpdated'},
        {field: 'lastUpdatedBy'}
    ]
};
