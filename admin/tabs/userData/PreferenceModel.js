/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {truncate} from 'lodash';
import {boolCheckCol, dateTimeCol} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {
    addAction,
    deleteAction,
    editAction,
    RestGridModel
} from '@xh/hoist/desktop/cmp/rest';
import {DifferModel} from '../../differ/DifferModel';
import {RegroupDialogModel} from '../../regroup/RegroupDialogModel';

@HoistModel
@LoadSupport
export class PreferenceModel {

    persistWith = {localStorageKey: 'xhAdminPreferenceState'};

    @managed
    regroupDialogModel = new RegroupDialogModel(this);

    @managed
    gridModel = new RestGridModel({
        persistWith: this.persistWith,
        colChooserModel: true,
        enableExport: true,
        selModel: 'multiple',
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
            del: (records) =>  `Are you sure you want to delete ${records.length} preference(s)? Deleting preferences can break running apps.`

        },
        menuActions: [
            addAction,
            editAction,
            deleteAction,
            this.regroupDialogModel.regroupAction
        ],
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
    differModel = new DifferModel({
        parentGridModel: this.gridModel,
        entityName: 'preference',
        columnFields: ['name', 'type'],
        matchFields: ['name'],
        valueRenderer: (v) => v?.defaultValue ?? ''
    });

    async doLoadAsync(loadSpec) {
        return this.gridModel.loadAsync(loadSpec).catchDefault();
    }
}


function truncateIfJson(defaultValue, {record}) {
    return record.data.type === 'json' ? truncate(defaultValue, {length: 500}) : defaultValue;
}
