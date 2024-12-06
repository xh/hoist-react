/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {GridModel, tagsRenderer} from '@xh/hoist/cmp/grid';
import {LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {groupBy, isEmpty, isEqual, map} from 'lodash';
import {action, observable} from 'mobx';

export class ClusterConsistencyModel extends BaseInstanceModel {
    @bindable groupBy: 'type' | 'owner' | 'inconsistencyState' = 'inconsistencyState';

    @managed detailPanelModel = new PanelModel({
        side: 'right',
        defaultSize: 450
    });

    @bindable.ref now: Date;

    @managed gridModel = new GridModel({
        selModel: 'multiple',
        enableExport: true,
        autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
        exportOptions: {filename: exportFilenameWithDate('consistency-check'), columns: 'ALL'},
        sortBy: 'displayName',
        groupBy: this.groupBy,
        store: {
            fields: [
                {name: 'name', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'owner', type: 'string'},
                {name: 'hasBreaks', type: 'bool'},
                {name: 'comparisonFields', type: 'auto'},
                {name: 'adminStatsbyInstance', type: 'auto'}
            ]
        },
        columns: [
            {
                field: 'hasBreaks',
                width: 34,
                align: 'center',
                resizable: false,
                headerName: Icon.warning(),
                headerTooltip: 'Has Breaks',
                renderer: v => (v ? Icon.warning({prefix: 'fas', intent: 'danger'}) : null)
            },
            {field: 'name'},
            {field: 'type'},
            {field: 'owner'},
            {
                field: 'comparisonFields',
                renderer: v => (!isEmpty(v) ? tagsRenderer(v) : null)
            }
        ],
        contextMenu: [...GridModel.defaultContextMenu]
    });

    @managed @observable.ref detailGridModel = this.createDetailGridModel();

    get instanceNames(): string[] {
        return this.parent.instanceNames;
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction(
            {
                track: () => this.groupBy,
                run: v => this.gridModel.setGroupBy(v)
            },
            {
                track: () => [this.gridModel.selectedRecord, this.instanceNames] as const,
                run: ([record, instanceNames], [oldRecord]) =>
                    this.updateDetailGridModel(record, instanceNames, oldRecord)
            }
        );
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const report = await XH.fetchJson({
                url: 'clusterConsistencyAdmin/getDistributedObjectsReport'
            });

            this.gridModel.loadData(this.processRawData(report.info));
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }

    @action
    updateDetailGridModel(record: StoreRecord, instanceNames: string[], oldRecord: StoreRecord) {
        if (isEmpty(record)) {
            // Only re-create grid model if columns are different.
            if (!isEmpty(oldRecord)) {
                XH.safeDestroy(this.detailGridModel);
                this.detailGridModel = this.createDetailGridModel();
            }
            return;
        }

        const {adminStatsbyInstance, comparisonFields} = record.data;

        // Only re-create grid model if columns are different.
        if (
            !oldRecord ||
            !isEqual(Object.keys(oldRecord.data.comparisonFields), comparisonFields)
        ) {
            XH.safeDestroy(this.detailGridModel);
            this.detailGridModel = this.createDetailGridModel(
                comparisonFields.map(fieldName => ({
                    field: {name: fieldName, displayName: fieldName}
                }))
            );
        }

        this.detailGridModel.loadData(
            instanceNames.map(instanceName => {
                const row = {instanceName};
                comparisonFields.forEach(fieldName => {
                    row[fieldName] = adminStatsbyInstance[instanceName][fieldName];
                });
                return row;
            })
        );
    }

    createDetailGridModel(columns = []) {
        return new GridModel({
            autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
            store: {idSpec: 'instanceName'},
            columns: [
                {
                    field: {name: 'instanceName', type: 'string', displayName: 'Instance'}
                },
                ...columns.map(col => ({
                    ...col,
                    cellClassRules: {
                        'xh-bg-intent-warning': ({value, data: record, colDef: {colId}}) =>
                            this.detailGridModel.store.records.some(
                                rec => rec.id !== record.id && rec.data[colId] != value
                            )
                    }
                }))
            ]
        });
    }

    //----------------------
    // Implementation
    //----------------------
    private processRawData(rawData: PlainObject[]): PlainObject[] {
        const byId = groupBy(rawData, 'id');
        return map(byId, objs => {
            const {id, name, type, owner, comparisonFields} = objs[0],
                adminStatsbyInstance = Object.fromEntries(
                    objs.map(obj => [obj.instanceName, obj.adminStats])
                );
            return {
                id,
                name,
                type,
                owner,
                comparisonFields,
                adminStatsbyInstance
            };
        });
    }
}
