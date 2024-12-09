/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/BaseInstanceModel';
import {GridModel, tagsRenderer} from '@xh/hoist/cmp/grid';
import {br, fragment} from '@xh/hoist/cmp/layout';
import {LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {RecordActionSpec, StoreRecord} from '@xh/hoist/data';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import {groupBy, isEmpty, isEqual, isNil, map} from 'lodash';
import {action, observable} from 'mobx';

export class DistributedObjectsModel extends BaseInstanceModel {
    @managed detailPanelModel = new PanelModel({
        side: 'right',
        defaultSize: 450
    });

    clearAction: RecordActionSpec = {
        text: 'Clear Objects',
        icon: Icon.reset(),
        intent: 'warning',
        actionFn: () => this.clearAsync(),
        displayFn: ({selectedRecords}) => ({
            hidden: AppModel.readonly,
            disabled:
                isEmpty(selectedRecords) || selectedRecords.every(r => r.data.objectType == 'Topic')
        }),
        recordsRequired: true
    };

    @managed gridModel = new GridModel({
        selModel: 'multiple',
        treeMode: true,
        autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
        enableExport: true,
        exportOptions: {filename: exportFilenameWithDate('distributed-objects'), columns: 'ALL'},
        sortBy: ['hasBreaks', 'name'],
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
        rowClassRules: {
            'xh-distributed-objects-row-has-break': ({data: record}) => record?.data.hasBreaks
        },
        columns: [
            {
                field: 'hasBreaks',
                width: 34,
                align: 'center',
                resizable: false,
                headerName: Icon.warning(),
                headerTooltip: 'Has Breaks',
                renderer: v =>
                    isNil(v)
                        ? null
                        : v
                          ? Icon.warning({prefix: 'fas', intent: 'danger'})
                          : Icon.check({prefix: 'fas', intent: 'success'})
            },
            {field: 'name'},
            {field: 'type'},
            {field: 'owner'},
            {
                field: 'comparisonFields',
                renderer: v => (!isEmpty(v) ? tagsRenderer(v) : null)
            }
        ],
        contextMenu: [this.clearAction, '-', ...GridModel.defaultContextMenu]
    });

    @managed @observable.ref detailGridModel = this.createDetailGridModel();

    get instanceNames(): string[] {
        return this.parent.instanceNames;
    }

    get selectedRecord(): StoreRecord {
        return this.gridModel.selectedRecord;
    }

    get selectedRecordName(): string {
        return this.selectedRecord?.data.name ?? null;
    }

    get selectedDetailRecord(): StoreRecord {
        return this.detailGridModel.selectedRecord;
    }

    override get instanceName(): string {
        return (this.selectedDetailRecord?.id as string) ?? this.parent.instanceName;
    }

    get selectedAdminStats() {
        return this.selectedRecord?.data.adminStatsbyInstance[this.instanceName];
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction({
            track: () => [this.gridModel.selectedRecord, this.instanceNames] as const,
            run: ([record, instanceNames], [oldRecord]) =>
                this.updateDetailGridModel(record, instanceNames, oldRecord)
        });
    }

    async clearAsync() {
        const {gridModel} = this;
        if (
            gridModel.selectedRecords.some(
                it => it.data.type != 'Cache' && !it.data.name.startsWith('cache')
            ) &&
            !(await XH.confirm({
                message: fragment(
                    'Your selection contains objects that may not be caches and may not be designed to be cleared.',
                    br(),
                    br(),
                    `Please ensure you understand the impact of this operation on the running application before proceeding.`
                ),
                confirmProps: {
                    text: 'Clear Objects',
                    icon: Icon.reset(),
                    intent: 'warning',
                    outlined: true,
                    autoFocus: false
                }
            }))
        ) {
            return;
        }

        try {
            await XH.fetchJson({
                url: 'distributedObjectAdmin/clearObjects',
                params: {
                    instance: this.instanceName,
                    names: this.gridModel.selectedIds
                }
            }).linkTo(this.loadModel);

            await this.refreshAsync();
            XH.successToast('Objects cleared.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    async clearHibernateCachesAsync() {
        const confirmed = await XH.confirm({
            message: fragment(
                'This will clear the second-level Hibernate caches for all domain objects, requiring the server to re-query the database for their latest state.',
                br(),
                br(),
                `This can resolve issues with data modifications made directly to the database not appearing in a running application, but should be used with care as it can have a temporary performance impact.`
            ),
            confirmProps: {
                text: 'Clear Hibernate Caches',
                icon: Icon.reset(),
                intent: 'warning',
                outlined: true,
                autoFocus: false
            }
        });
        if (!confirmed) return;

        try {
            await XH.fetchJson({
                url: 'distributedObjectAdmin/clearHibernateCaches',
                params: {instance: this.instanceName}
            }).linkTo(this.loadModel);

            await this.refreshAsync();
            XH.successToast('Hibernate Caches Cleared.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const report = await XH.fetchJson({
                url: 'clusterConsistencyAdmin/getDistributedObjectsReport'
            });

            this.gridModel.loadData(this.processReport(report));
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }

    //----------------------
    // Implementation
    //----------------------
    @action
    private updateDetailGridModel(
        record: StoreRecord,
        instanceNames: string[],
        oldRecord: StoreRecord
    ) {
        if (isEmpty(record)) {
            // Only re-create grid model if columns are different.
            if (!isEmpty(oldRecord)) {
                XH.safeDestroy(this.detailGridModel);
                this.detailGridModel = this.createDetailGridModel();
            }
            return;
        }

        const {adminStatsbyInstance, comparisonFields} = record.data,
            {selectedId} = this.detailGridModel ?? {};

        // Only re-create grid model if columns are different.
        if (!oldRecord || !isEqual(oldRecord.data.comparisonFields, comparisonFields)) {
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

        // Attempt to preserve selection across updates, or default to the globally-selected instance.
        this.detailGridModel.selectAsync(selectedId ?? this.instanceName);
    }

    private createDetailGridModel(columns = []) {
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

    private processReport({
        info,
        breaks
    }: {
        info: PlainObject[];
        breaks: Record<string, [string, string]>;
    }): PlainObject[] {
        const byId = groupBy(info, 'id');
        return map(byId, objs => {
            const {id, name, type, owner, comparisonFields} = objs[0],
                adminStatsbyInstance: PlainObject = Object.fromEntries(
                    objs.map(obj => [obj.instanceName, obj.adminStats])
                );
            return {
                id,
                name,
                type,
                owner: owner ?? this.deriveOwner(name),
                hasBreaks:
                    isEmpty(comparisonFields) || objs.length < 2 ? null : !isEmpty(breaks[id]),
                comparisonFields: comparisonFields ?? [],
                adminStatsbyInstance
            };
        });
    }

    private deriveOwner(name: string): string {
        // Hz ringbuffer that implements a CachedValue
        if (name.startsWith('_hz_rb_xhcachedvalue.')) {
            return name.substring(21);
        }
        // Hz ITopic that implements a CachedValue
        if (name.startsWith('xhcachedvalue.')) {
            return name.substring(14);
        }
        // Any object that utilizes `svc.hzName()`
        if (name.indexOf('[') !== -1) {
            return name.substring(0, name.indexOf('['));
        }
        if (name.startsWith('xh')) {
            return 'Hoist';
        }
        return name;
    }
}
