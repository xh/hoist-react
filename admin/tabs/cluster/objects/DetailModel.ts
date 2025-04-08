/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ClusterObjectsModel} from '@xh/hoist/admin/tabs/cluster/objects/ClusterObjectsModel';
import {ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, lookup, managed, XH} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {cloneDeep, isEmpty, isEqual, without} from 'lodash';
import {processWithFriendlyTimestamps} from '@xh/hoist/admin/AdminUtils';

export class DetailModel extends HoistModel {
    @lookup(ClusterObjectsModel)
    parent: ClusterObjectsModel;

    @managed
    @observable.ref
    gridModel: GridModel = null;

    //---------------------------------------------
    // Current cluster object and related.
    //--------------------------------------------
    get selectedObject(): StoreRecord {
        const selRecord = this.parent.selectedRecord;
        return !isEmpty(selRecord?.data.adminStatsByInstance) ? selRecord : null;
    }

    get objectName(): string {
        return this.selectedObject?.data.name ?? null;
    }

    get objectType(): string {
        return this.selectedObject?.data.type ?? null;
    }

    //--------------------------------
    // Selected instance and related.
    //--------------------------------
    get instanceName(): string {
        return this.gridModel?.selectedRecord?.id as string;
    }

    get selectedAdminStats() {
        return this.selectedObject?.data.adminStatsByInstance[this.instanceName];
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction({
            track: () => this.selectedObject,
            run: record => this.updateGridModel(record)
        });
    }

    //----------------------
    // Implementation
    //----------------------
    @action
    private updateGridModel(record: StoreRecord) {
        if (isEmpty(record)) return;

        const {adminStatsByInstance, comparableAdminStats} = record.data,
            instanceNames = Object.keys(adminStatsByInstance),
            diffFields = comparableAdminStats ?? [],
            otherFields = without(
                Object.keys(adminStatsByInstance[instanceNames[0]] ?? {}),
                ...diffFields,
                'name',
                'type',
                `config`,
                'replicate'
            ),
            selectedId = this.gridModel?.selectedId;

        const gridModel = this.createGridModel(diffFields, otherFields);
        gridModel.loadData(
            instanceNames.map(instanceName => {
                const data = cloneDeep(adminStatsByInstance[instanceName] ?? {});
                processWithFriendlyTimestamps(data);
                return {instanceName, ...data};
            })
        );

        XH.safeDestroy(this.gridModel);
        this.gridModel = gridModel;
        selectedId ? gridModel.selectAsync(selectedId) : gridModel.selectFirstAsync();
    }

    private createGridModel(diffFields: string[], otherFields: string[]) {
        return new GridModel({
            autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
            store: {idSpec: 'instanceName'},
            columns: [
                {field: {name: 'instanceName', type: 'string', displayName: 'Instance'}},
                ...diffFields.map(f => this.createColSpec(f, true)),
                ...otherFields.map(f => this.createColSpec(f, false))
            ]
        });
    }

    private createColSpec(fieldName: string, isDiff: boolean) {
        const ret: ColumnSpec = {
            field: {name: fieldName, displayName: fieldName},
            renderer: v => (typeof v === 'object' ? JSON.stringify(v) : v),
            autosizeMaxWidth: 200
        };
        if (isDiff) {
            ret.cellClassRules = {
                'xh-cluster-objects-cell-danger': ({value, colDef}) =>
                    !colDef ||
                    this.gridModel.store.records.some(r => !isEqual(r.data[colDef.colId], value)),
                'xh-cluster-objects-cell-success': ({value, colDef}) =>
                    colDef &&
                    this.gridModel.store.records.every(r => isEqual(r.data[colDef.colId], value))
            };
        }
        return ret;
    }
}
