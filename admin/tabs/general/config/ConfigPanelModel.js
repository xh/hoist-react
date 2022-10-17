/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed} from '@xh/hoist/core';
import {textArea} from '@xh/hoist/desktop/cmp/input';
import {
    addAction,
    cloneAction,
    deleteAction,
    editAction,
    RestGridModel,
    RestStore
} from '@xh/hoist/desktop/cmp/rest';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import * as Col from '@xh/hoist/admin/columns';
import {isNil, truncate} from 'lodash';
import {DifferModel} from '../../../differ/DifferModel';
import {RegroupDialogModel} from '../../../regroup/RegroupDialogModel';


export class ConfigPanelModel extends HoistModel {

    persistWith = {localStorageKey: 'xhAdminConfigState'};

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
            hidden = true,
            readonly = !XH.getUser().isHoistAdmin;

        this.gridModel = new RestGridModel({
            readonly,
            persistWith: this.persistWith,
            colChooserModel: true,
            enableExport: true,
            selModel: 'multiple',
            store: new RestStore({
                url: 'rest/configAdmin',
                reloadLookupsOnLoad: true,
                fieldDefaults: {disableXssProtection: true},
                fields: [
                    {...Col.name.field, required},
                    {...Col.groupName.field, lookupName: 'groupNames', required, enableCreate},
                    {...Col.valueType.field, lookupName: 'valueTypes', editable: 'onAdd', required},
                    {...Col.value.field, typeField: 'valueType', required},
                    {...Col.clientVisible.field, defaultValue: false, required},
                    {...Col.note.field},
                    {...Col.lastUpdated.field, editable: false},
                    {...Col.lastUpdatedBy.field, editable: false}
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
                {...Col.groupName, hidden},
                {...Col.name},
                {...Col.valueType},
                {...Col.value, renderer: this.configRenderer, tooltip: this.configRenderer},
                {...Col.clientVisible},
                {...Col.note},
                {...Col.lastUpdatedBy, hidden},
                {...Col.lastUpdated, hidden}
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
                return value?.toString();
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
