/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {boolCheckCol, dateTimeCol} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {RestGridModel} from '@xh/hoist/desktop/cmp/rest';
import {truncate} from 'lodash';
import {DifferModel} from '../../differ/DifferModel';

@HoistModel
@LoadSupport
export class PreferenceModel {

    persistWith = {localStorageKey: 'xhAdminPreferenceState'};

    @managed
    gridModel = new RestGridModel({
        persistWith: this.persistWith,
        enableColChooser: true,
        enableExport: true,
        store: {
            url: 'rest/preferenceAdmin',
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
                    name: 'type',
                    defaultValue: 'string',
                    lookupName: 'types',
                    editable: 'onAdd',
                    required: true
                },
                {
                    name: 'defaultValue',
                    typeField: 'type',
                    required: true
                },
                {
                    name: 'notes'
                },
                {
                    name: 'local',
                    type: 'bool',
                    defaultValue: false,
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
        filterFields: ['name', 'groupName'],
        actionWarning: {
            del: 'Are you sure you want to delete? Deleting preferences can break running apps.'
        },
        columns: [
            {field: 'local', ...boolCheckCol, width: 70},
            {field: 'name', width: 200},
            {field: 'type', width: 100},
            {field: 'defaultValue', width: 200, renderer: truncateIfJson},
            {field: 'groupName', hidden: true},
            {field: 'notes', minWidth: 200, flex: true},
            {field: 'lastUpdatedBy', width: 160, hidden: true},
            {field: 'lastUpdated', ...dateTimeCol, hidden: true}
        ],
        editors: [
            {field: 'name'},
            {field: 'groupName'},
            {field: 'type'},
            {field: 'defaultValue'},
            {field: 'notes', formField: {item: textArea({height: 100})}},
            {field: 'local'},
            {field: 'lastUpdated'},
            {field: 'lastUpdatedBy'}
        ]
    });

    @managed
    differModel = new DifferModel(this.gridModel, 'preference');

    async doLoadAsync(loadSpec) {
        return this.gridModel.loadAsync(loadSpec).catchDefault();
    }
}


function truncateIfJson(defaultValue, {record}) {
    return record.data.type === 'json' ? truncate(defaultValue, {length: 500}) : defaultValue;
}
