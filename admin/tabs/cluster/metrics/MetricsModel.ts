/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BaseAdminTabModel} from '@xh/hoist/admin/tabs/BaseAdminTabModel';
import {GridModel, tagsRenderer} from '@xh/hoist/cmp/grid';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {numberRenderer} from '@xh/hoist/format';
import {bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {groupBy as lodashGroupBy} from 'lodash';
import {runInAction} from 'mobx';

export class MetricsModel extends BaseAdminTabModel {
    @bindable sourceFilter: string[] = [];

    @observable.ref allMetrics: any[] = [];
    @observable.ref lastLoadDate: Date = null;

    @computed
    get sourceOptions(): string[] {
        return [...new Set(this.allMetrics.map(it => it.source))].filter(Boolean).sort();
    }

    @managed
    gridModel: GridModel = new GridModel({
        store: {
            idSpec: 'name',
            fields: [
                {name: 'name', type: 'string'},
                {name: 'description', type: 'string'},
                {name: 'baseUnit', type: 'string', displayName: 'Unit'},
                {name: 'type', type: 'string'},
                {name: 'source', type: 'string'},
                {name: 'count', type: 'number'}
            ]
        },
        sortBy: 'name',
        selModel: 'single',
        colChooserModel: true,
        columns: [
            {field: 'name', flex: true, minWidth: 200, maxWidth: 300},
            {field: 'source', width: 100},
            {field: 'type', width: 120},
            {field: 'baseUnit', width: 80, hidden: true},
            {field: 'count', width: 50},
            {field: 'description', flex: true}
        ]
    });

    @managed
    detailGridModel: GridModel = new GridModel({
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
            {field: 'count', width: 100, hidden: true, renderer: numberRenderer({precision: 0})},
            {field: 'max', width: 120, align: 'right', hidden: true, renderer: numberRenderer({})},
            {field: 'tags', flex: true, renderer: tagsRenderer}
        ]
    });

    @managed
    private timer: Timer;

    get selectedMetricName(): string {
        return this.gridModel.selectedRecord?.data?.name ?? null;
    }

    constructor() {
        super();
        makeObservable(this);

        this.timer = Timer.create({
            runFn: async () => {
                if (this.isVisible) {
                    await this.autoRefreshAsync();
                }
            },
            interval: 15 * SECONDS,
            delay: true
        });

        this.addReaction({
            track: () => this.sourceFilter,
            run: () => {
                this.loadMasterGrid(this.allMetrics);
                this.gridModel.ensureSelectionVisibleAsync();
            }
        });

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: () => this.loadDetailGrid()
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const data = await XH.fetchJson({
                url: 'metricsAdmin/listMetrics',
                loadSpec
            });

            if (loadSpec.isStale) return;

            const enriched = data.map(it => {
                const instance = it.tags.find(t => t.key === 'instance')?.value;
                const source = it.tags.find(t => t.key === 'source')?.value;
                const tags = sortTags(it.tags).map(t => `${t.key}: ${t.value}`);
                return {...it, instance, source, tags};
            });

            runInAction(() => {
                this.allMetrics = enriched;
                this.lastLoadDate = new Date();
            });
            this.loadMasterGrid(enriched);
            this.loadDetailGrid();
        } catch (e) {
            XH.handleException(e, {alertType: 'toast'});
        }
    }

    //------------------
    // Implementation
    //------------------
    private loadMasterGrid(enriched: any[]) {
        const {sourceFilter} = this,
            filtered = sourceFilter?.length
                ? enriched.filter(it => sourceFilter.includes(it.source))
                : enriched;
        const grouped = lodashGroupBy(filtered, 'name');
        const masterData = Object.entries(grouped).map(([name, items]) => {
            const rep = items[0];
            return {
                name,
                description: rep.description,
                baseUnit: rep.baseUnit,
                type: rep.type,
                source: rep.source,
                count: items.length
            };
        });
        this.gridModel.loadData(masterData);
    }

    private loadDetailGrid() {
        const selName = this.selectedMetricName;
        if (!selName) {
            this.detailGridModel.clear();
            return;
        }
        const details = this.allMetrics.filter(it => it.name === selName),
            isTimer = details[0]?.type === 'TIMER';

        this.detailGridModel.setColumnVisible('count', isTimer);
        this.detailGridModel.setColumnVisible('max', isTimer);
        this.detailGridModel.loadData(details);
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
