/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import * as Col from '@xh/hoist/admin/columns';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {FieldSpec} from '@xh/hoist/data';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {addAction, deleteAction, editAction, RestGridModel} from '@xh/hoist/desktop/cmp/rest';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {DifferModel} from '../../../differ/DifferModel';
import {RegroupDialogModel} from '../../../regroup/RegroupDialogModel';

export class PreferenceModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminPreferenceState'};

    @managed
    regroupDialogModel = new RegroupDialogModel(this);

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
            exportOptions: {filename: exportFilenameWithDate('prefs')},
            selModel: 'multiple',
            store: {
                url: 'rest/preferenceAdmin',
                reloadLookupsOnLoad: true,
                fieldDefaults: {disableXssProtection: true},
                fields: [
                    {...(Col.name.field as FieldSpec), required},
                    {
                        ...(Col.groupName.field as FieldSpec),
                        lookupName: 'groupNames',
                        required,
                        enableCreate
                    },
                    {
                        ...(Col.type.field as FieldSpec),
                        lookupName: 'types',
                        editable: 'onAdd',
                        required
                    },
                    {...(Col.defaultValue.field as FieldSpec), typeField: 'type', required},
                    Col.notes.field,
                    {...(Col.lastUpdated.field as FieldSpec), editable: false},
                    {...(Col.lastUpdatedBy.field as FieldSpec), editable: false}
                ]
            },
            sortBy: 'name',
            groupBy: 'groupName',
            unit: 'preference',
            filterFields: ['name', 'groupName'],
            actionWarning: {
                del: records =>
                    `Are you sure you want to delete ${records.length} preference(s)? Deleting preferences can break running apps.`
            },
            menuActions: [
                addAction,
                editAction,
                deleteAction,
                this.regroupDialogModel.regroupAction
            ],
            columns: [
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
            entityName: 'preference',
            columnFields: ['name', 'type'],
            matchFields: ['name'],
            valueRenderer: v => v?.defaultValue ?? ''
        });
    }

    @action
    closeDiffer() {
        const {differModel} = this;
        this.differModel = null;
        XH.safeDestroy(differModel);
    }
}
