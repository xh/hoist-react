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
import {bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {groupBy as lodashGroupBy} from 'lodash';

export class MetricsModel extends BaseAdminTabModel {
    @bindable groupBy: string = null;

    @observable.ref allMetrics: any[] = [];
    @observable.ref lastLoadDate: Date = null;

    @managed
    gridModel: GridModel = new GridModel({
        store: {
            idSpec: 'name',
            fields: [
                {name: 'name', type: 'string'},
                {name: 'description', type: 'string'},
                {name: 'baseUnit', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'source', type: 'string'},
                {name: 'count', type: 'number'}
            ]
        },
        sortBy: 'name',
        selModel: 'single',
        columns: [
            {field: 'name', flex: true, minWidth: 200, maxWidth: 300},
            {field: 'source', width: 100},
            {field: 'type', width: 120},
            {field: 'baseUnit', width: 80},
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
                {name: 'count', type: 'number'},
                {name: 'max', type: 'number'}
            ]
        },
        columns: [
            {field: 'instance', width: 140},
            {field: 'value', width: 120, align: 'right', renderer: numberRenderer({})},
            {field: 'count', hidden: true, renderer: numberRenderer({precision: 0})},
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
            track: () => this.groupBy,
            run: groupBy => this.gridModel.setGroupBy(groupBy ? [groupBy] : []),
            fireImmediately: true
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
                const priorityKeys = ['application', 'source', 'instance'];
                const tags = it.tags
                    .sort((a, b) => {
                        const ai = priorityKeys.indexOf(a.key),
                            bi = priorityKeys.indexOf(b.key);
                        if (ai !== bi) return bi === -1 ? -1 : ai === -1 ? 1 : ai - bi;
                        return 0;
                    })
                    .map(t => `${t.key}: ${t.value}`);
                return {...it, instance, source, tags};
            });

            this.allMetrics = enriched;
            this.lastLoadDate = new Date();
            this.loadMasterGrid(enriched);
        } catch (e) {
            XH.handleException(e, {alertType: 'toast'});
        }
    }

    //------------------
    // Implementation
    //------------------
    private loadMasterGrid(enriched: any[]) {
        const prevSelected = this.gridModel.selectedRecord?.data?.name;
        const grouped = lodashGroupBy(enriched, 'name');
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

        // Restore selection after refresh
        if (prevSelected) {
            const rec = this.gridModel.store.getById(prevSelected, true);
            if (rec) this.gridModel.selectAsync(rec);
        }
    }

    private loadDetailGrid() {
        const selName = this.selectedMetricName;
        if (!selName) {
            this.detailGridModel.clear();
            return;
        }
        const details = this.allMetrics.filter(it => it.name === selName);
        this.detailGridModel.loadData(details);
    }
}
