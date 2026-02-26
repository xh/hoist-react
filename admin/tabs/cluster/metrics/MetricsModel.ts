/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {BaseAdminTabModel} from '@xh/hoist/admin/tabs/BaseAdminTabModel';
import {GridModel, tagsRenderer} from '@xh/hoist/cmp/grid';
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {numberRenderer} from '@xh/hoist/format';
import {bindable, computed, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {groupBy} from 'lodash';

export class MetricsModel extends BaseAdminTabModel {
    override persistWith = {localStorageKey: 'xhAdminMetricsState'};

    @managed gridModel: GridModel;
    @managed groupingChooserModel: GroupingChooserModel;
    @managed detailGridModel: GridModel;
    @managed private timer: Timer;

    @bindable sourceFilter: string[] = [];

    @observable.ref allMetrics: any[] = [];

    @computed
    get sourceOptions(): string[] {
        return [...new Set(this.allMetrics.map(it => it.source))].filter(Boolean).sort();
    }

    get selectedMetricName(): string {
        return this.gridModel.selectedRecord?.data?.name ?? null;
    }

    constructor() {
        super();
        makeObservable(this);

        this.gridModel = new GridModel({
            persistWith: {...this.persistWith, path: 'mainGrid'},
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('metrics'), columns: 'ALL'},
            store: {
                idSpec: 'name',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'baseUnit', type: 'string', displayName: 'Unit'},
                    {name: 'type', type: 'string', isDimension: true},
                    {name: 'source', type: 'string', isDimension: true},
                    {name: 'count', type: 'number'}
                ]
            },
            sortBy: 'name',
            selModel: 'single',
            colChooserModel: true,
            columns: [
                {field: 'name'},
                {field: 'source', width: 100},
                {field: 'type', width: 120},
                {field: 'baseUnit', width: 80, hidden: true},
                {field: 'count', width: 50},
                {field: 'description', flex: true, minWidth: 200}
            ]
        });

        this.groupingChooserModel = new GroupingChooserModel({
            bind: this.gridModel,
            allowEmpty: true,
            persistWith: {
                ...this.persistWith,
                path: 'groupingChooser',
                persistFavorites: false
            }
        });

        this.detailGridModel = new GridModel({
            persistWith: {...this.persistWith, path: 'detailGrid'},
            enableExport: true,
            store: {
                fields: [
                    {name: 'tags', type: 'json'},
                    {name: 'instance', type: 'string'},
                    {name: 'value', type: 'number'},
                    {name: 'baseUnit', type: 'string', displayName: 'Unit'},
                    {name: 'count', type: 'number'},
                    {name: 'max', type: 'number'}
                ]
            },
            columns: [
                {field: 'instance', width: 140},
                {field: 'value', width: 120, align: 'right', renderer: numberRenderer({})},
                {field: 'baseUnit', width: 100},
                {
                    field: 'count',
                    width: 100,
                    hidden: true,
                    renderer: numberRenderer({precision: 0})
                },
                {
                    field: 'max',
                    width: 120,
                    align: 'right',
                    hidden: true,
                    renderer: numberRenderer({})
                },
                {field: 'tags', flex: true, renderer: tagsRenderer}
            ]
        });

        this.timer = Timer.create({
            runFn: async () => {
                if (this.isVisible) {
                    await this.autoRefreshAsync();
                }
            },
            interval: 15 * SECONDS,
            delay: true
        });

        this.addReaction(
            {
                track: () => this.sourceFilter,
                run: () => {
                    this.loadMasterGrid(this.allMetrics);
                    this.gridModel.ensureSelectionVisibleAsync();
                }
            },
            {
                track: () => this.gridModel.selectedRecord,
                run: () => this.loadDetailGrid()
            }
        );
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const data = await XH.fetchJson({
                url: 'metricsAdmin/listMetrics',
                loadSpec
            });

            if (loadSpec.isStale) return;

            const enriched = data.map(it => {
                const instance = it.tags.find(t => t.key === 'instance')?.value,
                    source = it.tags.find(t => t.key === 'source')?.value,
                    tags = sortTags(it.tags).map(t => `${t.key}: ${t.value}`);
                return {...it, instance, source, tags};
            });

            runInAction(() => (this.allMetrics = enriched));
            this.loadMasterGrid(enriched);
            this.loadDetailGrid();
        } catch (e) {
            if (!loadSpec.isAutoRefresh && !loadSpec.isStale) {
                XH.handleException(e, {alertType: 'toast'});
            }
        }
    }

    //------------------
    // Implementation
    //------------------
    private loadMasterGrid(enriched: any[]) {
        const {sourceFilter, gridModel} = this,
            filtered = sourceFilter?.length
                ? enriched.filter(it => sourceFilter.includes(it.source))
                : enriched;
        const masterData = Object.entries(groupBy(filtered, 'name')).map(([name, items]) => {
            const {description, baseUnit, type, source} = items[0];
            return {name, description, baseUnit, type, source, count: items.length};
        });
        gridModel.loadData(masterData);
    }

    private loadDetailGrid() {
        const {detailGridModel, allMetrics, selectedMetricName} = this;
        if (!selectedMetricName) {
            detailGridModel.clear();
            return;
        }
        const details = allMetrics.filter(it => it.name === selectedMetricName),
            isTimer = details[0]?.type === 'TIMER';

        detailGridModel.setColumnVisible('count', isTimer);
        detailGridModel.setColumnVisible('max', isTimer);
        detailGridModel.loadData(details);
    }
}

const PRIORITY_KEYS = ['application', 'source', 'instance'];

function sortTags(tags: {key: string; value: string}[]) {
    return [...tags].sort((a, b) => {
        const ai = PRIORITY_KEYS.indexOf(a.key),
            bi = PRIORITY_KEYS.indexOf(b.key);
        if (ai !== bi) return bi === -1 ? -1 : ai === -1 ? 1 : ai - bi;
        return 0;
    });
}
