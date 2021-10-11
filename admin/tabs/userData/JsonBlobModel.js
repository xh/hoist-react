/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed} from '@xh/hoist/core';
import {addAction, cloneAction, deleteAction, editAction, RestGridModel} from '@xh/hoist/desktop/cmp/rest';
import {makeObservable, observable, action} from '@xh/hoist/mobx';
import {fmtDateTime} from '@xh/hoist/format';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {
    aclCol,
    aclField,
    archivedCol,
    archivedDateCol,
    archivedDateField,
    archivedField,
    dateCreatedCol,
    dateCreatedField,
    descriptionCol,
    descriptionField,
    lastUpdatedByCol,
    lastUpdatedByField,
    lastUpdatedCol,
    lastUpdatedField,
    metaCol,
    metaField,
    nameCol,
    nameField,
    ownerCol,
    ownerField,
    tokenCol,
    tokenField,
    typeCol,
    typeField,
    valueCol,
    valueField
} from '@xh/hoist/admin/columns';
import {isDate} from 'lodash';

import {DifferModel} from '../../differ/DifferModel';

export class JsonBlobModel extends HoistModel {

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
            fieldDefaults: {disableXssProtection: true},
            fields: [
                {...tokenField, editable: false},
                {...ownerField},
                {...aclField},
                {...nameField, required: true},
                {...typeField, lookupName: 'types', required: true, enableCreate: true},
                {...valueField, type: 'json', required: true},
                {...metaField},
                {...descriptionField},
                {...archivedField, defaultValue: false, required: true},
                {...archivedDateField, editable: false},
                {...dateCreatedField, editable: false},
                {...lastUpdatedField, editable: false},
                {...lastUpdatedByField, editable: false}
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
        filterFields: ['name', 'owner', 'type', 'value', 'meta', 'description'],
        columns: [
            {...tokenCol, hidden: true},
            {...archivedCol},
            {...ownerCol},
            {...aclCol},
            {...nameCol},
            {...typeCol, width: 200},
            {...descriptionCol},
            {...valueCol},
            {...metaCol},
            {...archivedDateCol, hidden: true},
            {...dateCreatedCol, hidden: true},
            {...lastUpdatedCol, hidden: true},
            {...lastUpdatedByCol, hidden: true}
        ],
        editors: [
            {field: 'token'},
            {field: 'owner'},
            {field: 'acl'},
            {field: 'name'},
            {field: 'type'},
            {field: 'description', formField: {item: textArea()}},
            {field: 'value'},
            {field: 'meta'},
            {field: 'archived'},
            {field: 'archivedDate', formField: {readonlyRenderer: v => {
                return (!isDate(v) || v.getTime() === 0) ? '-' : fmtDateTime(v);
            }}},
            {field: 'dateCreated'},
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
            entityName: 'jsonBlob',
            displayName: 'JSON Blob',
            columnFields: ['name', 'owner', 'type', archivedDateCol],
            matchFields: ['name', 'owner', 'type', 'archivedDate']
        });
    }

    @action
    closeDiffer() {
        const {differModel} = this;
        this.differModel = null;
        XH.safeDestroy(differModel);
    }
}
