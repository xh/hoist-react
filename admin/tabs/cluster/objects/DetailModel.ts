/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ClusterObjectsModel} from '@xh/hoist/admin/tabs/cluster/objects/ClusterObjectsModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, lookup, managed, PlainObject, XH} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {fmtDateTimeSec, fmtJson} from '@xh/hoist/format';
import {makeObservable, action, observable} from '@xh/hoist/mobx';
import {DAYS} from '@xh/hoist/utils/datetime';
import {
    cloneDeep,
    forOwn,
    isArray,
    isEmpty,
    isEqual,
    isNumber,
    isPlainObject,
    without
} from 'lodash';

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

    fmtStats(stats: PlainObject): string {
        stats = cloneDeep(stats);
        this.processTimestamps(stats);
        return fmtJson(JSON.stringify(stats));
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
                this.processTimestamps(data);
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
                {
                    groupId: 'check',
                    headerName: 'Check',
                    headerAlign: 'center',
                    headerTooltip: 'Stats that are expected to be eventually consistent.',
                    children: diffFields.map(f => {
                        return {
                            ...this.createColSpec(f),
                            cellClassRules: {
                                'xh-cluster-objects-cell-danger': ({value, colDef}) =>
                                    !colDef ||
                                    this.gridModel.store.records.some(
                                        r => !isEqual(r.data[colDef.colId], value)
                                    ),
                                'xh-cluster-objects-cell-success': ({value, colDef}) =>
                                    colDef &&
                                    this.gridModel.store.records.every(r =>
                                        isEqual(r.data[colDef.colId], value)
                                    )
                            }
                        };
                    })
                },
                {
                    groupId: 'other',
                    headerName: 'Other',
                    headerAlign: 'center',
                    headerTooltip: 'Stats that are not expected to be consistent.',
                    children: otherFields.map(f => ({
                        ...this.createColSpec(f),
                        cellClassRules: {
                            'xh-cluster-objects-cell-warning': ({value, data, colDef}) =>
                                !colDef ||
                                this.gridModel.store.records.some(
                                    r =>
                                        r.id !== data.data.id &&
                                        !isEqual(r.data[colDef.colId], value)
                                )
                        }
                    }))
                },
                {
                    groupId: 'fillerHeader',
                    headerName: '',
                    children: [{colId: 'filler', headerName: '', flex: 1}]
                }
            ]
        });
    }

    private createColSpec(fieldName: string) {
        return {
            field: {name: fieldName, displayName: fieldName},
            renderer: v => (typeof v === 'object' ? JSON.stringify(v) : v),
            autosizeMaxWidth: 200
        };
    }

    private processTimestamps(stats: PlainObject) {
        forOwn(stats, (v, k) => {
            // Convert numbers that look like recent timestamps to date values.
            if (
                (k.endsWith('Time') ||
                    k.endsWith('Date') ||
                    k.endsWith('Timestamp') ||
                    k == 'timestamp') &&
                isNumber(v) &&
                v > Date.now() - 365 * DAYS
            ) {
                stats[k] = v ? fmtDateTimeSec(v, {fmt: 'MMM DD HH:mm:ss.SSS'}) : null;
            }
            if (isPlainObject(v) || isArray(v)) {
                this.processTimestamps(v);
            }
        });
    }
}
