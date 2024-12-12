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
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize, cloneDeep, forIn, groupBy, isEmpty, isEqual, mapValues} from 'lodash';
import {action, computed, observable, runInAction} from 'mobx';

export class DistributedObjectsModel extends BaseInstanceModel {
    @observable.ref startTimestamp: Date = null;
    @observable runDurationMs: number = 0;

    @bindable.ref showTypes = ['failed', 'passed', 'inactive'];

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
            text: 'Clear ' + pluralize('Object', selectedRecords?.length, true),
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
        sortBy: ['displayName'],
        store: {
            fields: [
                {name: 'name', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'parentName', type: 'string'},
                {name: 'provider', type: 'string'},
                {name: 'hasBreaks', type: 'string'},
                {name: 'comparisonFields', type: 'auto'},
                {name: 'adminStatsbyInstance', type: 'auto'}
            ],
            idSpec: 'name'
        },
        rowClassRules: {
            'xh-distributed-objects-row-has-break': ({data: record}) =>
                record?.data.hasBreaks === 'failed'
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
                    v === 'failed'
                        ? Icon.warning({prefix: 'fas', intent: 'danger'})
                        : v === 'passed'
                          ? Icon.check({prefix: 'fas', intent: 'success'})
                          : null
            },
            {field: 'displayName', isTreeColumn: true},
            {field: 'type'},
            {
                field: 'comparisonFields',
                renderer: v => (!isEmpty(v) ? tagsRenderer(v) : null)
            },
            {field: 'name', headerName: 'Full Name'},
            {field: 'parentName', hidden: true}
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

    @computed
    get counts() {
        const ret = {passed: 0, failed: 0, inactive: 0};
        this.gridModel.store.allRecords.forEach(record => {
            const {hasBreaks} = record.data;
            ret[hasBreaks]++;
        });
        return ret;
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction(
            {
                track: () => [this.gridModel.selectedRecord, this.instanceNames] as const,
                run: ([record, instanceNames], [oldRecord]) =>
                    this.updateDetailGridModel(record, instanceNames, oldRecord)
            },
            {
                track: () => this.showTypes,
                run: showTypes =>
                    isEmpty(showTypes)
                        ? this.gridModel.store.clearFilter()
                        : this.gridModel.store.setFilter({
                              op: 'OR',
                              filters: showTypes.map(it => ({
                                  field: 'hasBreaks',
                                  op: '=',
                                  value: it
                              }))
                          }),
                fireImmediately: true
            }
        );
    }
    //
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
                url: 'distributedObjectAdmin/getDistributedObjectsReport',
                params: {instance: this.instanceName}
            });

            this.gridModel.loadData(this.processReport(report));
            runInAction(() => {
                this.startTimestamp = report.startTimestamp
                    ? new Date(report.startTimestamp)
                    : null;
                this.runDurationMs =
                    report.endTimestamp && report.startTimestamp
                        ? report.endTimestamp - report.startTimestamp
                        : null;
            });
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
                const row = {instanceName},
                    data = cloneDeep(adminStatsbyInstance[instanceName] ?? {});
                this.processTimestamps(data);
                comparisonFields.forEach(fieldName => {
                    row[fieldName] = data?.[fieldName];
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
                        'xh-distributed-objects-cell-has-break': ({value, data: record, colDef}) =>
                            !colDef ||
                            this.detailGridModel.store.records.some(
                                rec => rec.id !== record.id && rec.data[colDef.colId] != value
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
        const byName = groupBy(info, 'name'),
            recordsByName = mapValues(byName, objs => {
                const {name, type, comparisonFields} = objs[0],
                    adminStatsbyInstance: PlainObject = Object.fromEntries(
                        objs.map(obj => [obj.instanceName, obj.adminStats])
                    );
                return {
                    name,
                    displayName: this.deriveDisplayName(name, type),
                    type,
                    parentName: this.deriveParent(name, type),
                    hasBreaks:
                        isEmpty(comparisonFields) || objs.length < 2
                            ? 'inactive'
                            : !isEmpty(breaks[name])
                              ? 'failed'
                              : 'passed',
                    comparisonFields: comparisonFields ?? [],
                    adminStatsbyInstance,
                    children: []
                };
            });

        // Create known parent/grouping records.
        // We leave children empty for now, as we'll populate them in the next step.
        recordsByName['App'] = {
            name: 'App',
            displayName: 'App',
            type: 'Provider',
            parentName: null,
            hasBreaks: 'inactive',
            comparisonFields: [],
            adminStatsbyInstance: {},
            children: []
        };
        recordsByName['Hoist'] = {
            name: 'Hoist',
            displayName: 'Hoist',
            type: 'Provider',
            parentName: null,
            hasBreaks: 'inactive',
            comparisonFields: [],
            adminStatsbyInstance: {},
            children: []
        };
        recordsByName['Hibernate (Hoist)'] = {
            name: 'Hibernate (Hoist)',
            displayName: 'Hibernate',
            type: 'Hibernate',
            parentName: 'Hoist',
            hasBreaks: 'inactive',
            comparisonFields: [],
            adminStatsbyInstance: {},
            children: []
        };
        recordsByName['Hibernate (App)'] = {
            name: 'Hibernate (App)',
            displayName: 'Hibernate',
            type: 'Hibernate',
            parentName: 'App',
            hasBreaks: 'inactive',
            comparisonFields: [],
            adminStatsbyInstance: {},
            children: []
        };

        // Place child records into the children of their parent record.
        forIn(recordsByName, record => {
            const parentName = record.parentName;
            if (parentName) {
                // Create any unknown/missing parent records
                // FIXME: Adding to a map while iterating over its values
                if (!recordsByName[parentName]) {
                    recordsByName[parentName] = {
                        name: parentName,
                        displayName: this.deriveDisplayName(parentName, null),
                        type: null,
                        parentName: this.deriveParent(parentName, null),
                        hasBreaks: 'inactive',
                        comparisonFields: [],
                        adminStatsbyInstance: {},
                        children: []
                    };
                }
                // Place under parent
                recordsByName[parentName].children.push(record);
            }
        });

        return Object.values(recordsByName).filter(record => !record.parentName);
    }

    private deriveParent(name: string, type: string): string {
        // Group collection caches under their parent object.
        if (type === 'Hibernate Cache') {
            const lastDotIdx = name.lastIndexOf('.');
            if (lastDotIdx != -1) {
                const last = name.substring(lastDotIdx + 1),
                    rest = name.substring(0, lastDotIdx);
                // Identify collection caches by lowercase name after last dot.
                if (last !== capitalize(last)) return rest;
            }
            // Otherwise, group under the correct hibernate group record.
            return name.startsWith('io.xh.hoist') ||
                name === 'default-query-results-region' ||
                name == 'default-update-timestamps-region'
                ? 'Hibernate (Hoist)'
                : 'Hibernate (App)';
        }
        // Hz Ringbuffer that implements a CachedValue.
        if (name.startsWith('_hz_rb_xhcachedvalue.')) {
            return name.substring(21);
        }
        // Hz ITopic that implements a CachedValue.
        if (name.startsWith('xhcachedvalue.')) {
            return name.substring(14);
        }
        // Hz ReplicatedMap that implements a Cache.
        if (name.startsWith('xhcache.')) {
            return name.substring(8);
        }
        // Any object that utilizes `svc.hzName()`.
        if (name.lastIndexOf('[') !== -1) {
            return name.substring(0, name.lastIndexOf('['));
        }
        // XH Services and impl objects.
        if (name.startsWith('xh') || name.startsWith('io.xh.hoist')) {
            return 'Hoist';
        }
        // Everything else belongs in the 'App' group.
        if (name !== 'App' && name !== 'Hoist') {
            return 'App';
        }
        return null;
    }

    private deriveDisplayName(name: string, type: string): string {
        // Hz Ringbuffer that implements a CachedValue.
        if (name.startsWith('_hz_rb_xhcachedvalue.')) {
            return type;
        }
        // Hz ITopic that implements a CachedValue.
        if (name.startsWith('xhcachedvalue.')) {
            return type;
        }
        // Hz ReplicatedMap that implements a Cache.
        if (name.startsWith('xhcache.')) {
            return type;
        }
        // Any object that utilizes `svc.hzName()`.
        if (name.lastIndexOf('[') !== -1) {
            return name.substring(name.lastIndexOf('[') + 1, name.lastIndexOf(']'));
        }
        // Any object that utilizes `class.getName()`.
        if (name.lastIndexOf('.') !== -1) {
            return name.substring(name.lastIndexOf('.') + 1);
        }
        // Other groupings, Services, impl objects, etc.
        return name;
    }
}
