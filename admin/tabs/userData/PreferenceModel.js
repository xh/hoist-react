/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed} from '@xh/hoist/core';
import {makeObservable, observable, action} from '@xh/hoist/mobx';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {
    addAction,
    deleteAction,
    editAction,
    RestGridModel
} from '@xh/hoist/desktop/cmp/rest';
import {
    defaultValueCol,
    groupNameCol,
    lastUpdatedByCol,
    lastUpdatedCol,
    localCol,
    nameCol,
    notesCol,
    typeCol
} from '@xh/hoist/admin/columns';

import {DifferModel} from '../../differ/DifferModel';
import {RegroupDialogModel} from '../../regroup/RegroupDialogModel';

export class PreferenceModel extends HoistModel {

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
            fieldDefaults: {disableXssProtection: true},
            fields: [
                {
                    name: 'name',
                    type: 'string',
                    required: true
                },
                {
                    name: 'groupName',
                    type: 'string',
                    displayName: 'Group',
                    lookupName: 'groupNames',
                    required: true,
                    enableCreate: true
                },
                {
                    name: 'type',
                    type: 'string',
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
                    name: 'notes',
                    type: 'string'
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
                    type: 'string',
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
            {...localCol},
            {...nameCol},
            {...typeCol},
            {...defaultValueCol},
            {...groupNameCol, hidden: true},
            {...notesCol},
            {...lastUpdatedByCol, hidden: true},
            {...lastUpdatedCol, hidden: true}
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
    @observable.ref
    differModel;

    constructor() {
        super();
        makeObservable(this);
    }

    async doLoadAsync(loadSpec) {
        return this.gridModel.loadAsync(loadSpec).catchDefault();
    }

    @action
    openDiffer() {
        this.differModel = new DifferModel({
            parentModel: this,
            entityName: 'preference',
            columnFields: ['name', 'type'],
            matchFields: ['name'],
            valueRenderer: (v) => v?.defaultValue ?? ''
        });
    }

    @action
    closeDiffer() {
        const {differModel} = this;
        this.differModel = null;
        XH.safeDestroy(differModel);
    }
}
