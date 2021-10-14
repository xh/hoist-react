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
import * as Col from '@xh/hoist/admin/columns';
import {isDate} from 'lodash';
import * as JBCol from './JsonBlobColumns';

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
                {...JBCol.token.field, editable: false},
                {...JBCol.owner.field},
                {...JBCol.acl.field},
                {...Col.name.field, required: true},
                {...Col.type.field, lookupName: 'types', required: true, enableCreate: true},
                {...Col.value.field, type: 'json', required: true},
                {...JBCol.meta.field},
                {...Col.description.field},
                {...JBCol.archived.field, defaultValue: false, required: true},
                {...JBCol.archivedDate.field, editable: false},
                {...Col.dateCreated.field, editable: false},
                {...Col.lastUpdated.field, editable: false},
                {...Col.lastUpdatedBy.field, editable: false}
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
            {...JBCol.token, hidden: true},
            {...JBCol.archived},
            {...JBCol.owner},
            {...JBCol.acl},
            {...Col.name},
            {...Col.type, width: 200},
            {...Col.description},
            {...Col.value},
            {...JBCol.meta},
            {...JBCol.archivedDate, hidden: true},
            {...Col.dateCreated, hidden: true},
            {...Col.lastUpdated, hidden: true},
            {...Col.lastUpdatedBy, hidden: true}
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
            columnFields: ['name', 'owner', 'type', JBCol.archivedDate],
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
