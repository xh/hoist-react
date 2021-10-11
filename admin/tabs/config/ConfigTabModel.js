/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {makeObservable, observable, action} from '@xh/hoist/mobx';
import {
    addAction,
    cloneAction,
    deleteAction,
    editAction,
    RestGridModel,
    RestStore
} from '@xh/hoist/desktop/cmp/rest';
import {
    clientVisibleCol,
    clientVisibleField,
    groupNameCol,
    groupNameField,
    lastUpdatedByCol,
    lastUpdatedByField,
    lastUpdatedCol,
    lastUpdatedField,
    nameCol,
    nameField,
    noteCol,
    noteField,
    valueCol,
    valueField,
    valueTypeCol,
    valueTypeField
} from '@xh/hoist/admin/columns';
import {isNil, truncate} from 'lodash';

import {DifferModel} from '../../differ/DifferModel';
import {RegroupDialogModel} from '../../regroup/RegroupDialogModel';

export class ConfigTabModel extends HoistModel {

    persistWith = {localStorageKey: 'xhAdminConfigState'};

    @managed
    regroupDialogModel = new RegroupDialogModel(this);

    @managed
    gridModel = new RestGridModel({
        persistWith: this.persistWith,
        colChooserModel: true,
        enableExport: true,
        selModel: 'multiple',
        store: new RestStore({
            url: 'rest/configAdmin',
            reloadLookupsOnLoad: true,
            fieldDefaults: {disableXssProtection: true},
            fields: [
                {...nameField, required: true},
                {...groupNameField, lookupName: 'groupNames', required: true, enableCreate: true},
                {...valueTypeField, lookupName: 'valueTypes', editable: 'onAdd', required: true},
                {...valueField, typeField: 'valueType', required: true},
                {...clientVisibleField, defaultValue: false, required: true},
                {...noteField},
                {...lastUpdatedField, editable: false},
                {...lastUpdatedByField, editable: false}
            ]
        }),
        actionWarning: {
            del: (records) =>  `Are you sure you want to delete ${records.length} config(s)? Deleting configs can break running apps.`
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
            deleteAction,
            this.regroupDialogModel.regroupAction
        ],
        prepareCloneFn: ({clone}) => clone.name = `${clone.name}_CLONE`,
        unit: 'config',
        filterFields: ['name', 'value', 'groupName', 'note'],
        sortBy: 'name',
        groupBy: 'groupName',
        columns: [
            {...groupNameCol, hidden: true},
            {...nameCol},
            {...valueTypeCol},
            {...valueCol, flex: null, width: 200, renderer: this.configRenderer, tooltip: this.configRenderer},
            {...clientVisibleCol},
            {...noteCol},
            {...lastUpdatedByCol, hidden: true},
            {...lastUpdatedCol, hidden: true}
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
    @observable.ref
    differModel;

    constructor() {
        super();
        makeObservable(this);
    }

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

    @action
    openDiffer() {
        this.differModel = new DifferModel({
            parentModel: this,
            entityName: 'config',
            columnFields: ['name', {field: 'valueType', headerName: 'Type'}],
            matchFields: ['name'],
            valueRenderer: (v) => {
                if (isNil(v)) return '';
                return v.valueType === 'pwd' ? '*****' : v.value;
            }
        });
    }

    @action
    closeDiffer() {
        const {differModel} = this;
        this.differModel = null;
        XH.safeDestroy(differModel);
    }
}
