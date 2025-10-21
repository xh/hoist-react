/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {
    addAction,
    cloneAction,
    deleteAction,
    editAction,
    RestGridModel
} from '@xh/hoist/desktop/cmp/rest';
import {fmtDateTime} from '@xh/hoist/format';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isDate} from 'lodash';
import {DifferModel} from '../../../differ/DifferModel';
import * as JBCol from './JsonBlobColumns';

export class JsonBlobModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminJsonBlobState'};

    @managed
    gridModel: RestGridModel;

    @managed
    @observable.ref
    differModel: DifferModel;

    constructor() {
        super();
        makeObservable(this);

        const required = true,
            enableCreate = true,
            hidden = true;

        this.gridModel = new RestGridModel({
            readonly: AppModel.readonly,
            persistWith: this.persistWith,
            colChooserModel: true,
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('json-blobs')},
            selModel: 'multiple',
            store: {
                url: 'rest/jsonBlobAdmin',
                reloadLookupsOnLoad: true,
                fieldDefaults: {enableXssProtection: false},
                fields: [
                    {...(JBCol.token.field as FieldSpec), editable: false},
                    JBCol.owner.field,
                    JBCol.acl.field,
                    {...(Col.name.field as FieldSpec), required},
                    {...(Col.type.field as FieldSpec), lookupName: 'types', required, enableCreate},
                    {...(Col.value.field as FieldSpec), type: 'json', required},
                    JBCol.meta.field,
                    Col.description.field,
                    {...(JBCol.archived.field as FieldSpec), defaultValue: false, required},
                    {...(JBCol.archivedDate.field as FieldSpec), editable: false},
                    {...(Col.dateCreated.field as FieldSpec), editable: false},
                    {...(Col.lastUpdated.field as FieldSpec), editable: false},
                    {...(Col.lastUpdatedBy.field as FieldSpec), editable: false}
                ]
            },
            menuActions: [addAction, editAction, cloneAction, deleteAction],
            prepareCloneFn: ({clone}) => (clone.name = `${clone.name}_CLONE`),
            sortBy: ['owner', 'name'],
            groupBy: 'type',
            unit: 'blob',
            filterFields: ['name', 'owner', 'type', 'value', 'meta', 'description'],
            columns: [
                {...JBCol.token, hidden},
                {...JBCol.archived},
                {...JBCol.owner},
                {...JBCol.acl},
                {...Col.name},
                {...Col.type, width: 200},
                {...Col.description},
                {...Col.value, hidden},
                {...JBCol.meta, hidden},
                {...JBCol.archivedDate, hidden},
                {...Col.dateCreated, hidden},
                {...Col.lastUpdatedBy, hidden},
                {...Col.lastUpdated}
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
                {
                    field: 'archivedDate',
                    formField: {
                        readonlyRenderer: v => {
                            return !isDate(v) || v.getTime() === 0 ? '-' : fmtDateTime(v);
                        }
                    }
                },
                {field: 'dateCreated'},
                {field: 'lastUpdated'},
                {field: 'lastUpdatedBy'}
            ]
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
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
