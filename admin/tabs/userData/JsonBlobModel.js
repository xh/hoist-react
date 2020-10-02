/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSupport, managed} from '@xh/hoist/core';
import {
    addAction,
    cloneAction,
    deleteAction,
    editAction,
    RestGridModel
} from '@xh/hoist/desktop/cmp/rest';
import {dateTimeCol} from '@xh/hoist/cmp/grid';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {truncate} from 'lodash';

import {DifferModel} from '../../differ/DifferModel';

@HoistModel
@LoadSupport
export class JsonBlobModel {

    persistWith = {localStorageKey: 'xhAdminJsonBlobState'};

    @managed
    gridModel = new RestGridModel({
        persistWith: this.persistWith,
        colChooserModel: true,
        enableExport: true,
        selModel: 'multiple',
        store: {
            url: 'rest/jsonBlobAdmin',
            reloadLookupsOnLoad: true,
            fields: [
                {
                    name: 'token',
                    editable: false
                },
                {
                    name: 'owner'
                },
                {
                    name: 'acl',
                    displayName: 'ACL'
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
                    name: 'lastUpdatedBy',
                    editable: false
                }
            ]
        },
        toolbarActions: [
            addAction,
            editAction,
            cloneAction,
            deleteAction
        ],
        menuActions: [
            addAction,
            editAction,
            cloneAction,
            deleteAction
        ],
        prepareCloneFn: ({clone}) => clone.name = `${clone.name}_CLONE`,
        sortBy: ['owner', 'name'],
        groupBy: 'type',
        unit: 'blob',
        filterFields: ['name', 'owner', 'type', 'value', 'description'],
        columns: [
            {field: 'token', width: 100, hidden: true},
            {field: 'owner', width: 200},
            {field: 'acl', width: 80},
            {field: 'name', width: 200},
            {field: 'type', width: 200},
            {field: 'description', width: 200},
            {field: 'value', flex: 1, renderer: v => truncate(v, {length: 500})},
            {field: 'dateCreated', ...dateTimeCol, hidden: true},
            {field: 'lastUpdated', ...dateTimeCol, hidden: true},
            {field: 'lastUpdatedBy', width: 160, hidden: true}
        ],
        editors: [
            {field: 'token'},
            {field: 'owner'},
            {field: 'acl'},
            {field: 'name'},
            {field: 'type'},
            {field: 'description', formField: {item: textArea()}},
            {field: 'value'},
            {field: 'dateCreated'},
            {field: 'lastUpdated'},
            {field: 'lastUpdatedBy'}
        ]
    });

    @managed
    differModel = new DifferModel({
        parentGridModel: this.gridModel,
        entityName: 'jsonBlob',
        displayName: 'json blob',
        columnFields: ['name', 'owner', 'type'],
        matchFields: ['name', 'owner', 'type']
    });

    async doLoadAsync(loadSpec) {
        return this.gridModel.loadAsync(loadSpec).catchDefault();
    }

}