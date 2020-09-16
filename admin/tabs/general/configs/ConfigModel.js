/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {boolCheckCol, dateTimeCol} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {
    addAction,
    cloneAction,
    bulkDeleteAction,
    editAction,
    RestGridModel,
    RestStore
} from '@xh/hoist/desktop/cmp/rest';
import {truncate} from 'lodash';
import {DifferModel} from '../../../differ/DifferModel';


@HoistModel
@LoadSupport
export class ConfigModel {

    persistWith = {localStorageKey: 'xhAdminConfigState'};

    @managed
    gridModel = new RestGridModel({
        persistWith: this.persistWith,
        enableColChooser: true,
        enableExport: true,
        selModel: 'multiple',
        store: new RestStore({
            url: 'rest/configAdmin',
            reloadLookupsOnLoad: true,
            fields: [
                {
                    name: 'name',
                    required: true
                },
                {
                    name: 'groupName',
                    displayName: 'Group',
                    lookupName: 'groupNames',
                    required: true,
                    enableCreate: true
                },
                {
                    name: 'valueType',
                    displayName: 'Type',
                    lookupName: 'valueTypes',
                    editable: 'onAdd',
                    required: true
                },
                {
                    name: 'value',
                    typeField: 'valueType',
                    required: true
                },
                {
                    name: 'clientVisible',
                    type: 'bool',
                    defaultValue: false,
                    required: true
                },
                {
                    name: 'note',
                    displayName: 'Notes'
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
        actionWarning: {
            del: (records) =>  `Are you sure you want to delete ${records.length} config(s)? Deleting configs can break running apps.`
        },
        toolbarActions: [
            addAction,
            editAction,
            cloneAction,
            bulkDeleteAction
        ],
        menuActions: [
            addAction,
            editAction,
            cloneAction,
            bulkDeleteAction
        ],
        prepareCloneFn: ({clone}) => clone.name = `${clone.name}_CLONE`,
        unit: 'config',
        filterFields: ['name', 'value', 'groupName', 'note'],

        sortBy: 'name',
        groupBy: 'groupName',
        columns: [
            {field: 'groupName', width: 100, hidden: true},
            {field: 'name', width: 200},
            {field: 'valueType', width: 80, align: 'center'},
            {field: 'value', width: 200, renderer: this.configRenderer, tooltip: this.configRenderer},
            {field: 'clientVisible', ...boolCheckCol, headerName: 'Client?', width: 75},
            {field: 'note', minWidth: 60, flex: true, tooltip: true},
            {field: 'lastUpdatedBy', width: 160, hidden: true},
            {field: 'lastUpdated', ...dateTimeCol, hidden: true}
        ],
        editors: [
            {field: 'name'},
            {field: 'groupName'},
            {field: 'valueType'},
            {field: 'value'},
            {field: 'note', formField: {item: textArea({height: 100})}},
            {field: 'clientVisible'},
            {field: 'lastUpdated'},
            {field: 'lastUpdatedBy'}
        ]
    });

    @managed
    differModel = new DifferModel(this.gridModel, 'config');

    async doLoadAsync(loadSpec) {
        return this.gridModel.loadAsync(loadSpec).catchDefault();
    }

    configRenderer(value, {record}) {
        switch (record.data.valueType) {
            case 'pwd':
                return '*****';
            case 'json':
                return truncate(value, {length: 500});
            default:
                return value;
        }
    }
}
