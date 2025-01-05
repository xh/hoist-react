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
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable, computed, observable, runInAction} from '@xh/hoist/mobx';
import {isDisplayed, pluralize} from '@xh/hoist/utils/js';
import {groupBy, isEmpty, mapValues, size} from 'lodash';
import {createRef} from 'react';

export class ClusterObjectsModel extends HoistModel {
    viewRef = createRef<HTMLElement>();

    @observable.ref startTimestamp: Date = null;
    @observable runDurationMs: number = 0;

    @bindable hideUnchecked: boolean = false;
    @bindable.ref textFilter: FilterTestFn = null;

    clearHibernateCachesAction: RecordActionSpec = {
        text: 'Clear Selected Hibernate Caches',
        icon: Icon.reset(),
        intent: 'warning',
        actionFn: () => this.clearHibernateCachesAsync(),
        displayFn: ({selectedRecords}) => {
            const caches = selectedRecords.filter(it => it.data.type === 'Hibernate Cache');
            return {
                hidden: AppModel.readonly || isEmpty(caches),
                text: `Clear Hibernate Cache`
            };
        },
        recordsRequired: true
    };

    @managed gridModel = new GridModel({
        selModel: 'multiple',
        treeMode: true,
        autosizeOptions: {mode: 'managed', includeCollapsedChildren: true},
        enableExport: true,
        exportOptions: {filename: exportFilenameWithDate('cluster-objects'), columns: 'ALL'},
        sortBy: ['displayName'],
        store: {
            fields: [
                {name: 'name', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'parentName', type: 'string'},
                {name: 'provider', type: 'string'},
                {name: 'compareState', type: 'string'},
                {name: 'comparableAdminStats', type: 'auto'},
                {name: 'adminStatsByInstance', type: 'auto'}
            ],
            idSpec: 'name'
        },
        rowClassRules: {
            'xh-cluster-objects-row-has-break': ({data: record}) =>
                record?.data.compareState === 'failed'
        },
        columns: [
            {
                field: 'compareState',
                width: 30,
                align: 'center',
                resizable: false,
                headerName: '',
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
                field: 'comparableAdminStats',
                renderer: v => (!isEmpty(v) ? tagsRenderer(v) : null),
                hidden: true
            },
            {field: 'name', headerName: 'Full Name', hidden: true},
            {field: 'parentName', hidden: true}
        ],
        contextMenu: [this.clearHibernateCachesAction, '-', ...GridModel.defaultContextMenu]
    });

    get selectedRecord(): StoreRecord {
        return this.gridModel.selectedRecord;
    }

    get isSingleInstance() {
        return this.gridModel.store.allRecords.every(
            rec => size(rec.data?.adminStatsByInstance) <= 1
        );
    }

    @computed
    get counts() {
        const ret = {passed: 0, failed: 0, unchecked: 0};
        this.gridModel.store.allRecords.forEach(record => {
            ret[record.data.compareState]++;
        });
        return ret;
    }

    constructor() {
        super();
        makeObservable(this);
        this.addReaction({
            track: () => [this.textFilter, this.hideUnchecked],
            run: this.applyFilters,
            fireImmediately: true
        });
    }

    async clearHibernateCachesAsync() {
        const {selectedRecords} = this.gridModel,
            cacheRecords = selectedRecords.filter(it => it.data.type === 'Hibernate Cache'),
            count = cacheRecords.length,
            confirmed = await XH.confirm({
                message: fragment(
                    `This will clear ${pluralize('Hibernate Cache', count, true)}.`,
                    br(),
                    br(),
                    `This can resolve issues with data modifications made directly to the database not appearing in a running application, but should be used with care as it can have a temporary performance impact.`
                ),
                confirmProps: {
                    text: `Clear ${pluralize('Hibernate Cache', count, true)}`,
                    icon: Icon.reset(),
                    intent: 'warning',
                    outlined: true,
                    autoFocus: false
                }
            });

        if (!confirmed) return;

        try {
            await XH.postJson({
                url: 'clusterObjectsAdmin/clearHibernateCaches',
                body: {
                    names: cacheRecords.map(it => it.id)
                }
            }).linkTo(this.loadModel);

            await this.refreshAsync();
            XH.successToast(`${pluralize('Hibernate Cache', count, true)} cleared.`);
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
            XH.successToast('All Hibernate Caches cleared.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const report = await XH.fetchJson({
                url: 'clusterObjectsAdmin/getClusterObjectsReport'
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
    private applyFilters() {
        const {hideUnchecked, textFilter, isSingleInstance} = this,
            filters: FilterLike[] = [textFilter];

        if (hideUnchecked && !isSingleInstance) {
            filters.push({
                field: 'compareState',
                op: '!=',
                value: 'unchecked'
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
    }): ClusterObjectRecord[] {
        const byName = groupBy(info, 'name'),
            recordsByName: Record<string, ClusterObjectRecord> = mapValues(byName, objs => {
                const {name, type, comparableAdminStats} = objs[0],
                    adminStatsByInstance: PlainObject = Object.fromEntries(
                        objs.map(obj => [obj.instanceName, obj.adminStats])
                    );
                return {
                    name,
                    displayName: this.deriveDisplayName(name, type),
                    type,
                    parentName: this.deriveParent(name, type),
                    compareState: (isEmpty(comparableAdminStats) || objs.length < 2
                        ? 'unchecked'
                        : !isEmpty(breaks[name])
                          ? 'failed'
                          : 'passed') as CompareState,
                    comparableAdminStats: comparableAdminStats ?? [],
                    adminStatsByInstance,
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
                          : 'unchecked';
            }
        }

        return Object.values(recordsByName).filter(record => !record.parentName);
    }

    private createParentRecord(args: {
        name: string;
        type: string;
        parentName: string;
        displayName: string;
    }): ClusterObjectRecord {
        return {
            ...args,
            compareState: 'unchecked',
            comparableAdminStats: [],
            adminStatsByInstance: {},
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
                if (!isEmpty(last) && last[0] !== last[0].toUpperCase()) return rest;
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

type CompareState = 'failed' | 'passed' | 'unchecked';

interface ClusterObjectRecord {
    name: string;
    displayName: string;
    type: string;
    parentName?: string;
    compareState: CompareState;
    comparableAdminStats: string[];
    adminStatsByInstance: Record<string, PlainObject>;
    children: ClusterObjectRecord[];
}
