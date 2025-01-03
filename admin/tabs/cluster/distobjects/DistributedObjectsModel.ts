/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {AppModel} from '@xh/hoist/admin/AppModel';
import {GridModel, tagsRenderer} from '@xh/hoist/cmp/grid';
import {br, fragment} from '@xh/hoist/cmp/layout';
import {HoistModel, LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {FilterLike, FilterTestFn, RecordActionSpec, StoreRecord} from '@xh/hoist/data';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDateTimeSec, fmtJson} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {DAYS} from '@xh/hoist/utils/datetime';
import {isDisplayed, pluralize} from '@xh/hoist/utils/js';
import {
    capitalize,
    cloneDeep,
    forOwn,
    groupBy,
    isArray,
    isEmpty,
    isEqual,
    isNumber,
    isPlainObject,
    mapValues,
    size,
    without
} from 'lodash';
import {action, computed, observable, runInAction} from 'mobx';
import {createRef} from 'react';

export class DistributedObjectsModel extends HoistModel {
    viewRef = createRef<HTMLElement>();

    @observable.ref startTimestamp: Date = null;
    @observable runDurationMs: number = 0;

    @bindable showInactive: boolean = true;
    @bindable.ref textFilter: FilterTestFn = null;

    @managed detailPanelModel = new PanelModel({
        side: 'right',
        defaultSize: 450
    });

    clearHibernateCachesAction: RecordActionSpec = {
        text: 'Clear Selected Hibernate Caches',
        icon: Icon.reset(),
        intent: 'warning',
        actionFn: () => this.clearHibernateCachesAsync(),
        displayFn: ({selectedRecords}) => {
            const clearableSelectedRecords = selectedRecords.filter(
                    it => it.data.type === 'Hibernate Cache'
                ),
                clearableCount = clearableSelectedRecords.length;
            return {
                hidden: AppModel.readonly,
                text: `Clear ${pluralize('Hibernate Cache', clearableCount, true)}`,
                disabled: isEmpty(clearableSelectedRecords)
            };
        },
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
                {name: 'compareState', type: 'string'},
                {name: 'comparisonFields', type: 'auto'},
                {name: 'adminStatsbyInstance', type: 'auto'}
            ],
            idSpec: 'name'
        },
        rowClassRules: {
            'xh-distributed-objects-row-has-break': ({data: record}) =>
                record?.data.compareState === 'failed'
        },
        columns: [
            {
                field: 'compareState',
                width: 38,
                align: 'center',
                resizable: false,
                headerName: Icon.diff(),
                headerTooltip: 'Compare State',
                renderer: v =>
                    v === 'failed'
                        ? Icon.diff({prefix: 'fas', intent: 'danger'})
                        : v === 'passed'
                          ? Icon.check({prefix: 'fas', intent: 'success'})
                          : null
            },
            {field: 'displayName', isTreeColumn: true},
            {field: 'type'},
            {
                field: 'comparisonFields',
                renderer: v => (!isEmpty(v) ? tagsRenderer(v) : null),
                hidden: true
            },
            {field: 'name', headerName: 'Full Name', hidden: true},
            {field: 'parentName', hidden: true}
        ],
        contextMenu: [this.clearHibernateCachesAction, '-', ...GridModel.defaultContextMenu]
    });

    @managed @observable.ref detailGridModel = this.createDetailGridModel();

    get selectedRecord(): StoreRecord {
        return this.gridModel.selectedRecord;
    }

    get selectedRecordName(): string {
        return this.selectedRecord?.data.name ?? null;
    }

    get selectedRecordType(): string {
        return this.selectedRecord?.data.type ?? null;
    }

    get selectedDetailRecord(): StoreRecord {
        return this.detailGridModel.selectedRecord;
    }

    get instanceName(): string {
        return this.selectedDetailRecord?.id as string;
    }

    get selectedAdminStats() {
        return this.selectedRecord?.data.adminStatsbyInstance[this.instanceName];
    }

    get isSingleInstance() {
        return this.gridModel.store.allRecords.every(
            rec => size(rec.data?.adminStatsbyInstance) <= 1
        );
    }

    @computed
    get counts() {
        const ret = {passed: 0, failed: 0, inactive: 0};
        this.gridModel.store.allRecords.forEach(record => {
            ret[record.data.compareState]++;
        });
        return ret;
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction(
            {
                track: () => this.gridModel.selectedRecord,
                run: (record, oldRecord) => this.updateDetailGridModel(record, oldRecord)
            },
            {
                track: () => [this.textFilter, this.showInactive],
                run: this.applyFilters,
                fireImmediately: true
            }
        );
    }

    async clearHibernateCachesAsync() {
        const {selectedRecords} = this.gridModel,
            clearableSelectedRecords = selectedRecords.filter(
                it => it.data.type === 'Hibernate Cache'
            ),
            clearableCount = clearableSelectedRecords.length,
            totalCount = selectedRecords.length;
        if (
            !(await XH.confirm({
                message: fragment(
                    `This will clear the cached state of ${clearableCount !== totalCount ? clearableCount + ' out of the ' : ''}${pluralize('selected record', totalCount, true)}.`,
                    br(),
                    br(),
                    `This can resolve issues with data modifications made directly to the database not appearing in a running application, but should be used with care as it can have a temporary performance impact.`
                ),
                confirmProps: {
                    text: `Clear ${pluralize('Hibernate Cache', clearableCount, true)}`,
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
            await XH.postJson({
                url: 'distributedObjectAdmin/clearHibernateCaches',
                body: {
                    names: clearableSelectedRecords.map(it => it.id)
                }
            }).linkTo(this.loadModel);

            await this.refreshAsync();
            XH.successToast(`${pluralize('hibernate cache', clearableCount, true)} cleared.`);
        } catch (e) {
            XH.handleException(e);
        }
    }

    async clearAllHibernateCachesAsync() {
        const confirmed = await XH.confirm({
            message: fragment(
                'This will clear the second-level Hibernate caches for all domain objects, requiring the server to re-query the database for their latest state.',
                br(),
                br(),
                `This can resolve issues with data modifications made directly to the database not appearing in a running application, but should be used with care as it can have a temporary performance impact.`
            ),
            confirmProps: {
                text: 'Clear All Hibernate Caches',
                icon: Icon.reset(),
                intent: 'warning',
                outlined: true,
                autoFocus: false
            }
        });
        if (!confirmed) return;

        try {
            await XH.fetchJson({
                url: 'clusterObjectsAdmin/clearAllHibernateCaches'
            }).linkTo(this.loadModel);

            await this.refreshAsync();
            XH.successToast('All hibernate caches cleared.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const report = await XH.fetchJson({
                url: 'clusterObjectsAdmin/getClusterObjectsReport'
            });

            report.info = report.info.map(it => ({
                ...it,
                comparableFields: it.comparableAdminStats
            }));

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
            XH.handleException(e, {
                alertType: 'toast',
                showAlert: this.isVisible && !loadSpec.isAutoRefresh,
                logOnServer: this.isVisible && !loadSpec.isAutoRefresh
            });
        }
    }

    get isVisible() {
        return isDisplayed(this.viewRef.current);
    }

    //----------------------
    // Implementation
    //----------------------
    @action
    private updateDetailGridModel(record: StoreRecord, oldRecord: StoreRecord) {
        if (isEmpty(record)) {
            // Only re-create grid model if columns are different.
            if (!isEmpty(oldRecord)) {
                XH.safeDestroy(this.detailGridModel);
                this.detailGridModel = this.createDetailGridModel();
            }
            return;
        }

        const {adminStatsbyInstance, comparisonFields} = record.data,
            instanceNames = Object.keys(adminStatsbyInstance),
            nonComparisonFields = without(
                Object.keys(adminStatsbyInstance[instanceNames[0]] ?? {}),
                ...comparisonFields
            ),
            {selectedId} = this.detailGridModel ?? {};

        // Always re-create the grid model, as its not trivial to check if columns have changed.
        XH.safeDestroy(this.detailGridModel);
        const createColumnForField = fieldName => ({
            field: {name: fieldName, displayName: fieldName},
            renderer: v => (typeof v === 'object' ? JSON.stringify(v) : v),
            autosizeMaxWidth: 200
        });
        this.detailGridModel = this.createDetailGridModel(
            comparisonFields.map(createColumnForField),
            nonComparisonFields.map(createColumnForField)
        );

        this.detailGridModel.loadData(
            instanceNames.map(instanceName => {
                const data = cloneDeep(adminStatsbyInstance[instanceName] ?? {});
                this.processTimestamps(data);
                return {instanceName, ...data};
            })
        );

        // Attempt to preserve selection across updates, or default.
        if (selectedId) {
            this.detailGridModel.selectAsync(selectedId);
        } else {
            this.detailGridModel.selectFirstAsync();
        }
    }

    private createDetailGridModel(comparedCols = [], notComparedCols = []) {
        return new GridModel({
            autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
            store: {idSpec: 'instanceName'},
            columns: [
                {
                    field: {name: 'instanceName', type: 'string', displayName: 'Instance'}
                },
                {
                    groupId: 'comparisonFields',
                    headerName: 'Compared Stats',
                    headerTooltip:
                        'Stats that are expected to be eventually consistent between all instances.',
                    children: comparedCols.map(col => ({
                        ...col,
                        cellClassRules: {
                            'xh-distributed-objects-cell-danger': ({value, colDef}) =>
                                !colDef ||
                                this.detailGridModel.store.records.some(
                                    rec => !isEqual(rec.data[colDef.colId], value)
                                ),
                            'xh-distributed-objects-cell-success': ({value, colDef}) =>
                                colDef &&
                                this.detailGridModel.store.records.every(rec =>
                                    isEqual(rec.data[colDef.colId], value)
                                )
                        }
                    }))
                },
                {
                    groupId: 'otherFields',
                    headerName: 'Other Stats',
                    headerTooltip:
                        'Stats that are not expected to be consistent between all instances.',
                    children: notComparedCols.map(col => ({
                        ...col,
                        cellClassRules: {
                            'xh-distributed-objects-cell-warning': ({
                                value,
                                data: record,
                                colDef
                            }) =>
                                !colDef ||
                                this.detailGridModel.store.records.some(
                                    rec =>
                                        rec.id !== record.id &&
                                        !isEqual(rec.data[colDef.colId], value)
                                )
                        }
                    }))
                }
            ]
        });
    }

    private applyFilters() {
        const {showInactive, textFilter, isSingleInstance} = this,
            filters: FilterLike[] = [textFilter];

        if (!showInactive && !isSingleInstance) {
            filters.push({
                field: 'compareState',
                op: '!=',
                value: 'inactive'
            });
        }

        this.gridModel.store.setFilter(filters);
    }

    private processReport({
        info,
        breaks
    }: {
        info: PlainObject[];
        breaks: Record<string, [string, string]>;
    }): DistributedObjectRecord[] {
        const byName = groupBy(info, 'name'),
            recordsByName: Record<string, DistributedObjectRecord> = mapValues(byName, objs => {
                const {name, type, comparisonFields} = objs[0],
                    adminStatsbyInstance: PlainObject = Object.fromEntries(
                        objs.map(obj => [obj.instanceName, obj.adminStats])
                    );
                return {
                    name,
                    displayName: this.deriveDisplayName(name, type),
                    type,
                    parentName: this.deriveParent(name, type),
                    compareState: (isEmpty(comparisonFields) || objs.length < 2
                        ? 'inactive'
                        : !isEmpty(breaks[name])
                          ? 'failed'
                          : 'passed') as CompareState,
                    comparisonFields: comparisonFields ?? [],
                    adminStatsbyInstance,
                    children: []
                };
            });

        // Create known parent/grouping records.
        // We leave children empty for now, as we'll populate them all in the next step.
        recordsByName['App'] = this.createParentRecord({
            name: 'App',
            displayName: 'App',
            type: 'Provider',
            parentName: null
        });
        recordsByName['Hoist'] = this.createParentRecord({
            name: 'Hoist',
            displayName: 'Hoist',
            type: 'Provider',
            parentName: null
        });
        recordsByName['Hibernate (Hoist)'] = this.createParentRecord({
            name: 'Hibernate (Hoist)',
            displayName: 'Hibernate',
            type: 'Hibernate',
            parentName: 'Hoist'
        });
        recordsByName['Hibernate (App)'] = this.createParentRecord({
            name: 'Hibernate (App)',
            displayName: 'Hibernate',
            type: 'Hibernate',
            parentName: 'App'
        });

        // Place child records into the children of their parent record. Note that this may create
        // any missing parents as needed - they will be appended to the end of the list.
        const recordNames = Object.keys(recordsByName);
        for (let idx = 0; idx < recordNames.length; idx++) {
            const name = recordNames[idx],
                record = recordsByName[name],
                parentName = record.parentName;
            if (parentName) {
                // Create any unknown/missing parent records.
                if (!recordsByName[parentName]) {
                    recordsByName[parentName] = this.createParentRecord({
                        name: parentName,
                        displayName: this.deriveDisplayName(parentName, null),
                        type: null,
                        parentName: this.deriveParent(parentName, null)
                    });
                    // Also append to end of list, to ensure we eventually also process this parent.
                    recordNames.push(parentName);
                }

                // Place self under parent.
                recordsByName[parentName].children.push(record);

                // Aggregate parent compareState.
                const state = record.compareState,
                    parentState = recordsByName[parentName].compareState;
                recordsByName[parentName].compareState =
                    state === 'failed' || parentState === 'failed'
                        ? 'failed'
                        : state === 'passed' || parentState === 'passed'
                          ? 'passed'
                          : 'inactive';
            }
        }

        return Object.values(recordsByName).filter(record => !record.parentName);
    }

    private createParentRecord(args: {
        name: string;
        type: string;
        parentName: string;
        displayName: string;
    }): DistributedObjectRecord {
        return {
            ...args,
            compareState: 'inactive',
            comparisonFields: [],
            adminStatsbyInstance: {},
            children: []
        };
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

    fmtStats(stats: PlainObject): string {
        stats = cloneDeep(stats);
        this.processTimestamps(stats);
        return fmtJson(JSON.stringify(stats));
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

type CompareState = 'failed' | 'passed' | 'inactive';

interface DistributedObjectRecord {
    name: string;
    displayName: string;
    type: string;
    parentName?: string;
    compareState: CompareState;
    comparisonFields: string[];
    adminStatsbyInstance: Record<string, PlainObject>;
    children: DistributedObjectRecord[];
}
