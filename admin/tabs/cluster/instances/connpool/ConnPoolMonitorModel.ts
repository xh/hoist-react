/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilenameWithDate} from '@xh/hoist/admin/AdminUtils';
import {timestampNoYear} from '@xh/hoist/admin/columns';
import {BaseInstanceModel} from '@xh/hoist/admin/tabs/cluster/instances/BaseInstanceModel';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {GridModel} from '@xh/hoist/cmp/grid';
import {LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {fmtTime} from '@xh/hoist/format';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {forOwn, sortBy} from 'lodash';

export class ConnPoolMonitorModel extends BaseInstanceModel {
    @bindable enabled: boolean = true;
    @bindable.ref poolConfiguration: PlainObject = {};

    @managed gridModel: GridModel;
    @managed chartModel: ChartModel;

    constructor() {
        super();
        makeObservable(this);
        this.gridModel = new GridModel({
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('conn-pool-monitor')},
            filterModel: true,
            sortBy: 'timestamp|desc',
            store: {idSpec: 'timestamp'},
            headerMenuDisplay: 'hover',
            colDefaults: {filterable: true, align: 'right'},
            columns: [
                {...timestampNoYear},
                {field: 'size'},
                {field: 'active'},
                {field: 'idle'},
                {field: 'waitCount'},
                {field: 'borrowed'},
                {field: 'returned'},
                {field: 'created'},
                {field: 'released'},
                {field: 'reconnected'},
                {field: 'removeAbandoned'},
                {field: 'releasedIdle'}
            ]
        });

        this.chartModel = new ChartModel({
            highchartsConfig: {
                chart: {
                    zoomType: 'x',
                    animation: false
                },
                plotOptions: {
                    series: {
                        animation: false,
                        marker: {enabled: false}
                    }
                },
                title: {text: null},
                xAxis: {
                    type: 'datetime',
                    labels: {
                        formatter: function () {
                            return fmtTime(this.value);
                        }
                    }
                },
                yAxis: [
                    {
                        floor: 0,
                        title: {text: '# Connections'},
                        offset: 0
                    }
                ],
                tooltip: {outside: true, shared: true}
            }
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {gridModel, chartModel} = this;

        try {
            const resp = await XH.fetchJson({
                url: 'connectionPoolMonitorAdmin/snapshots',
                params: {instance: this.instanceName},
                loadSpec
            });

            const {enabled, snapshots, poolConfiguration} = resp;
            this.enabled = enabled;
            this.poolConfiguration = poolConfiguration;
            if (!enabled) {
                this.clear();
                return;
            }

            // Server returns map by timestamp - flatted to array and load into grid records.
            let snaps = [];
            forOwn(snapshots, (snap, ts) => {
                snaps.push({timestamp: parseInt(ts), ...snap});
            });
            snaps = sortBy(snaps, 'timestamp');
            gridModel.loadData(snaps);

            // Process further for chart series.
            const sizeSeries = [],
                activeSeries = [];

            snaps.forEach(snap => {
                sizeSeries.push([snap.timestamp, snap.size]);
                activeSeries.push([snap.timestamp, snap.active]);
            });

            chartModel.setSeries([
                {
                    name: 'Size',
                    data: sizeSeries,
                    color: '#1976d2',
                    step: true
                },
                {
                    name: 'Active',
                    data: activeSeries,
                    color: '#ef6c00',
                    step: true
                }
            ]);
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }

    async takeSnapshotAsync() {
        try {
            await XH.fetchJson({
                url: 'connectionPoolMonitorAdmin/takeSnapshot',
                params: {instance: this.instanceName}
            }).linkTo(this.loadModel);
            await this.refreshAsync();
            XH.successToast('Updated snapshot loaded.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    async resetStatsAsync() {
        try {
            await XH.fetchJson({
                url: 'connectionPoolMonitorAdmin/resetStats',
                params: {instance: this.instanceName}
            }).linkTo(this.loadModel);
            await this.refreshAsync();
            XH.successToast('Connection pool stats reset.');
        } catch (e) {
            XH.handleException(e);
        }
    }

    private clear() {
        this.gridModel.clear();
        this.chartModel.clear();
    }
}
