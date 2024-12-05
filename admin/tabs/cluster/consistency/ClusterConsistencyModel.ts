/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {ColumnSpec, GridModel, tagsRenderer} from '@xh/hoist/cmp/grid';
import {LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDateTimeSec, fmtJson, fmtNumber} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {isEmpty, isEqual} from 'lodash';
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
                {name: 'inconsistencyState', type: 'string'},
                {name: 'maxLastUpdated', type: 'auto'},
                {name: 'checks', type: 'auto'},
                {name: 'lastUpdated', type: 'auto'}
            ],
            processRawData: o => this.processRawData(o)
        },
        rowClassRules: {
            'xh-bg-intent-warning': ({data: record}) =>
                record?.data.inconsistencyState === 'Has Inconsistency'
        },
        columns: [
            {
                field: 'inconsistencyState',
                width: 34,
                align: 'center',
                resizable: false,
                headerName: Icon.warning(),
                headerTooltip: 'Has Inconsistency?',
                renderer: v =>
                    v === 'Has Inconsistency'
                        ? Icon.warning({prefix: 'fas', intent: 'danger'})
                        : null
            },
            {field: 'name'},
            {field: 'type'},
            {field: 'owner'},
            {
                ...this.getLastUpdated(),
                field: 'maxLastUpdated'
            },
            {
                hidden: true,
                field: 'checks',
                renderer: v => (!isEmpty(v) ? tagsRenderer(Object.keys(v)) : null),
                tooltip: v => fmtJson(JSON.stringify(v))
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
            const response = await XH.fetchJson({
                url: 'clusterConsistencyAdmin/listAllChecks'
            });

            this.now = new Date();

            return this.gridModel.loadData(response);
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

        const checks = record.data.checks ?? {},
            lastUpdated = record.data.lastUpdated ?? {},
            fieldNames = Object.keys(checks);

        // Only re-create grid model if columns are different.
        if (!oldRecord || !isEqual(Object.keys(oldRecord.data.checks), fieldNames)) {
            XH.safeDestroy(this.detailGridModel);
            this.detailGridModel = this.createDetailGridModel(
                fieldNames.map(fieldName => ({field: {name: fieldName}}))
            );
        }

        this.detailGridModel.loadData(
            instanceNames.map(instanceName => {
                const row = {
                    instanceName,
                    lastUpdated: lastUpdated[instanceName]
                };
                fieldNames.forEach(fieldName => {
                    row[fieldName] = checks[fieldName][instanceName];
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
                })),
                this.getLastUpdated()
            ]
        });
    }

    //----------------------
    // Implementation
    //----------------------
    private processRawData(obj: PlainObject): PlainObject {
        return {
            ...obj,
            // Convert the bool into a string for ease of grouping.
            inconsistencyState: obj.hasInconsistency ? 'Has Inconsistency' : 'Is Consistent',
            // Max lastUpdated date of all checks.
            maxLastUpdated: obj.lastUpdated
                ? Object.values(obj.lastUpdated).reduce(
                      (prev, next) => (next > prev ? next : prev),
                      0
                  )
                : null
        };
    }

    getLastUpdated(): ColumnSpec {
        return {
            field: 'lastUpdated',
            displayName: 'Last Updated',
            rendererIsComplex: true,
            align: 'right',
            renderer: v =>
                v
                    ? fmtNumber((this.now.getTime() - v) / 1000, {
                          precision: 3,
                          label: ' seconds ago'
                      })
                    : null,
            tooltip: v => fmtDateTimeSec(v)
        };
    }
}
