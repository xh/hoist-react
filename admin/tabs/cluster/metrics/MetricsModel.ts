/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BaseAdminTabModel} from '@xh/hoist/admin/tabs/BaseAdminTabModel';
import {GridModel, tagsRenderer} from '@xh/hoist/cmp/grid';
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {numberRenderer} from '@xh/hoist/format';
import {bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {uniq} from 'lodash';

export class MetricsModel extends BaseAdminTabModel {
    @bindable instance: string = null;
    @bindable source: string = null;

    @observable.ref instances: string[] = [];
    @observable.ref sources: string[] = [];

    @managed
    groupingChooserModel: GroupingChooserModel = new GroupingChooserModel({
        dimensions: ['name', 'instance', 'type', 'source'],
        initialValue: ['name']
    });

    @managed
    gridModel: GridModel = new GridModel({
        store: {
            fields: [
                {name: 'name', type: 'string'},
                {name: 'instance', type: 'string'},
                {name: 'source', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'value', type: 'number'},
                {name: 'count', type: 'number'},
                {name: 'max', type: 'number'},
                {name: 'description', type: 'string'},
                {name: 'baseUnit', type: 'string'},
                {name: 'tags', type: 'json'}
            ]
        },
        sortBy: 'name',
        enableExport: true,
        colChooserModel: true,
        columns: [
            {field: 'name', minWidth: 200, maxWidth: 200},
            {field: 'instance', width: 160, hidden: true},
            {field: 'source', width: 100, hidden: true},
            {field: 'type', width: 140},
            {field: 'value', width: 140, align: 'right', renderer: numberRenderer({})},
            {
                field: 'count',
                width: 100,
                align: 'right',
                hidden: true,
                renderer: numberRenderer({precision: 0})
            },
            {field: 'max', width: 140, align: 'right', hidden: true, renderer: numberRenderer({})},
            {field: 'baseUnit', width: 100, maxWidth: 100},
            {field: 'tags', minWidth: 150, flex: true, renderer: tagsRenderer},
            {field: 'description', hidden: true}
        ]
    });

    @managed
    private timer: Timer;

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
            track: () => this.groupingChooserModel.value,
            run: groupBy => this.gridModel.setGroupBy(groupBy),
            fireImmediately: true
        });

        this.addReaction({
            track: () => [this.instance, this.source],
            run: ([instance, source]) => {
                const filters = [
                    instance ? {field: 'instance', op: '=' as const, value: instance} : null,
                    source ? {field: 'source', op: '=' as const, value: source} : null
                ].filter(Boolean);
                this.gridModel.store.setFilter(filters.length ? filters : null);
            }
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {gridModel} = this;

        try {
            const data = await XH.fetchJson({
                url: 'metricsAdmin/listMetrics',
                loadSpec
            });

            if (!loadSpec.isStale) {
                const enriched = data.map(it => {
                    const instance = it.tags.find(t => t.key === 'instance')?.value;
                    const source = it.tags.find(t => t.key === 'source')?.value;
                    const priorityKeys = ['source', 'instance'];
                    const tags = it.tags
                        .filter(t => t.key !== 'application')
                        .sort((a, b) => {
                            const ai = priorityKeys.indexOf(a.key),
                                bi = priorityKeys.indexOf(b.key);
                            if (ai !== bi) return bi === -1 ? -1 : ai === -1 ? 1 : ai - bi;
                            return 0;
                        })
                        .map(t => `${t.key}: ${t.value}`);
                    return {...it, instance, source, tags};
                });
                gridModel.loadData(enriched);
                this.instances = uniq<string>(enriched.map(it => it.instance)).sort();
                this.sources = uniq<string>(enriched.map(it => it.source))
                    .filter(Boolean)
                    .sort();
            }
        } catch (e) {
            XH.handleException(e, {alertType: 'toast'});
        }
    }
}
