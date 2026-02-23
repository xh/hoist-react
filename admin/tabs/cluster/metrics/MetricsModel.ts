/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BaseAdminTabModel} from '@xh/hoist/admin/tabs/BaseAdminTabModel';
import {GridModel} from '@xh/hoist/cmp/grid';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {numberRenderer} from '@xh/hoist/format';
import {makeObservable} from '@xh/hoist/mobx';
import {Timer} from '@xh/hoist/utils/async';
import {SECONDS} from '@xh/hoist/utils/datetime';

export class MetricsModel extends BaseAdminTabModel {
    @managed
    gridModel: GridModel = new GridModel({
        store: {
            //idSpec: ({name, tags}) => `${name}__${tags}`,
            fields: [
                {name: 'name', type: 'string'},
                {name: 'type', type: 'string'},
                {name: 'value', type: 'number'},
                {name: 'count', type: 'number'},
                {name: 'max', type: 'number'},
                {name: 'description', type: 'string'},
                {name: 'baseUnit', type: 'string'},
                {name: 'tags', type: 'string'}
            ]
        },
        groupBy: 'name',
        sortBy: 'name',
        enableExport: true,
        colChooserModel: true,
        columns: [
            {field: 'name', flex: 2},
            {field: 'type', width: 140},
            {field: 'value', width: 140, align: 'right', renderer: numberRenderer({})},
            {field: 'count', width: 100, align: 'right', renderer: numberRenderer({precision: 0})},
            {field: 'max', width: 140, align: 'right', renderer: numberRenderer({})},
            {field: 'baseUnit', width: 100},
            {field: 'tags'},
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
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {gridModel} = this;

        try {
            const data = await XH.fetchJson({
                url: 'metricsAdmin/listMetrics',
                loadSpec
            });

            if (!loadSpec.isStale) {
                gridModel.loadData(data);
            }
        } catch (e) {
            XH.handleException(e, {alertType: 'toast'});
        }
    }
}
