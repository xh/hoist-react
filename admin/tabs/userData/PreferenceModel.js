/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
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
import * as Col from '@xh/hoist/admin/columns';

import {DifferModel} from '../../differ/DifferModel';
import {RegroupDialogModel} from '../../regroup/RegroupDialogModel';

export class PreferenceModel extends HoistModel {

    persistWith = {localStorageKey: 'xhAdminPreferenceState'};

    @managed
    regroupDialogModel = new RegroupDialogModel(this);

    @managed
    gridModel;

    @managed
    @observable.ref
    differModel;

    constructor() {
        super();
        makeObservable(this);

        const required = true,
            enableCreate = true,
            hidden = true;

        this.gridModel = new RestGridModel({
            persistWith: this.persistWith,
            colChooserModel: true,
            enableExport: true,
            selModel: 'multiple',
            store: {
                url: 'rest/preferenceAdmin',
                reloadLookupsOnLoad: true,
                fieldDefaults: {disableXssProtection: true},
                fields: [
                    {...Col.name.field, required},
                    {...Col.groupName.field, lookupName: 'groupNames', required, enableCreate},
                    {...Col.type.field, lookupName: 'types', editable: 'onAdd', required},
                    {...Col.defaultValue.field, typeField: 'type', required},
                    {...Col.notes.field},
                    {...Col.local.field, defaultValue: false, required},
                    {...Col.lastUpdated.field, editable: false},
                    {...Col.lastUpdatedBy.field, editable: false}
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
                {...Col.local},
                {...Col.name},
                {...Col.type},
                {...Col.defaultValue},
                {...Col.groupName, hidden},
                {...Col.notes},
                {...Col.lastUpdatedBy, hidden},
                {...Col.lastUpdated, hidden}
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
