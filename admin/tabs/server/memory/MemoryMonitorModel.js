/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {ChartModel} from '@xh/hoist/cmp/chart';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {fmtTime} from '@xh/hoist/format';
import {checkMinVersion} from '@xh/hoist/utils/js';
import {forOwn, sortBy} from 'lodash';
import * as MCol from '../../monitor/MonitorColumns';

export class MemoryMonitorModel extends HoistModel {

    /** @member {GridModel} */
    @managed gridModel;
    /** @member {ChartModel} */
    @managed chartModel;

    get minVersionWarning() {
        const minVersion = '8.7.0',
            currVersion = XH.environmentService.get('hoistCoreVersion');
        return checkMinVersion(currVersion, minVersion) ? null : `This feature requires Hoist Core v${minVersion} or greater.`;
    }

    constructor() {
        super();

        this.gridModel = new GridModel({
            sortBy: 'timestamp|desc',
            enableExport: true,
            filterModel: true,
            store: {idSpec: 'timestamp'},
            colDefaults: {filterable: true},
            columns: [
                MCol.timestamp,
                MCol.totalHeapMb,
                MCol.maxHeapMb,
                MCol.freeHeapMb,
                MCol.usedHeapMb,
                MCol.usedPctTotal
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
                    labels: {formatter: function() {return fmtTime(this.value)}}
                },
                yAxis: [
                    {
                        floor: 0,
                        title: {text: 'JVM Heap (mb)'}
                    },
                    {
                        opposite: true,
                        linkedTo: 0,
                        title: {text: undefined}
                    }
                ],
                tooltip: {outside: true, shared: true}
            }
        });
    }

    async doLoadAsync(loadSpec) {
        const {gridModel, chartModel, minVersionWarning} = this;
        if (minVersionWarning) return;

        try {
            const snapsByTimestamp = await XH.fetchJson({
                url: 'memoryMonitorAdmin/snapshots',
                loadSpec
            });

            // Server returns map by timestamp - flatted to array and load into grid records.
            let snaps = [];
            forOwn(snapsByTimestamp, (snap, ts) => {
                snaps.push({timestamp: parseInt(ts), ...snap});
            });
            snaps = sortBy(snaps, 'timestamp');
            gridModel.loadData(snaps);

            // Process further for chart series.
            const maxSeries = [],
                totalSeries = [],
                usedSeries = [];

            snaps.forEach(snap => {
                maxSeries.push([snap.timestamp, snap.maxHeapMb]);
                totalSeries.push([snap.timestamp, snap.totalHeapMb]);
                usedSeries.push([snap.timestamp, snap.usedHeapMb]);
            });

            chartModel.setSeries([
                {
                    name: 'Max',
                    data: maxSeries,
                    color: '#ef6c00',
                    step: true
                },
                {
                    name: 'Total',
                    data: totalSeries,
                    color: '#1976d2',
                    step: true
                },
                {
                    name: 'Used',
                    type: 'area',
                    data: usedSeries,
                    color: '#bd7c7c',
                    fillOpacity: 0.3,
                    lineWidth: 1
                }
            ]);
        } catch (e) {
            XH.handleException(e);
        }
    }

    async takeSnapshotAsync() {
        try {
            await XH.fetchJson({url: 'memoryMonitorAdmin/takeSnapshot'}).linkTo(this.loadModel);
            await this.loadAsync();
            XH.successToast('Updated snapshot loaded');
        } catch (e) {
            XH.handleException(e);
        }
    }

    async requestGcAsync() {
        try {
            await XH.fetchJson({url: 'memoryMonitorAdmin/requestGc'}).linkTo(this.loadModel);
            await this.loadAsync();
            XH.successToast('GC run complete');
        } catch (e) {
            XH.handleException(e);
        }
    }
}
