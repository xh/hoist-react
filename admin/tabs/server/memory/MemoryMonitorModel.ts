/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {ChartModel} from '@xh/hoist/cmp/chart';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {fmtTime} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {forOwn, sortBy} from 'lodash';
import * as MCol from '../../monitor/MonitorColumns';

export class MemoryMonitorModel extends HoistModel {
    @managed gridModel: GridModel;
    @managed chartModel: ChartModel;

    get enabled(): boolean {
        return !!XH.configService.get('xhMemoryMonitoringConfig').enabled;
    }

    get heapDumpDir(): string {
        return XH.configService.get('xhMemoryMonitoringConfig').heapDumpDir;
    }

    constructor() {
        super();

        this.gridModel = new GridModel({
            sortBy: 'timestamp|desc',
            enableExport: true,
            filterModel: true,
            store: {idSpec: 'timestamp'},
            colDefaults: {filterable: true},
            headerMenuDisplay: 'hover',
            columns: [
                MCol.timestamp,
                {
                    groupId: 'heap',
                    headerAlign: 'center',
                    children: [
                        MCol.totalHeapMb,
                        MCol.maxHeapMb,
                        MCol.freeHeapMb,
                        MCol.usedHeapMb,
                        MCol.usedPctMax
                    ]
                },
                {
                    groupId: 'GC',
                    headerAlign: 'center',
                    children: [MCol.collectionCount, MCol.avgCollectionTime, MCol.pctCollectionTime]
                }
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
                        height: '20%',
                        title: {text: 'GC Avg (ms)'}
                    },
                    {
                        floor: 0,
                        top: '30%',
                        height: '70%',
                        title: {text: 'Heap (mb)'}
                    }
                ],
                tooltip: {outside: true, shared: true}
            }
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {gridModel, chartModel} = this;

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
                usedSeries = [],
                avgGCSeries = [],
                pctGCSeries = [];

            snaps.forEach(snap => {
                maxSeries.push([snap.timestamp, snap.maxHeapMb]);
                totalSeries.push([snap.timestamp, snap.totalHeapMb]);
                usedSeries.push([snap.timestamp, snap.usedHeapMb]);

                avgGCSeries.push([snap.timestamp, snap.avgCollectionTime]);
                pctGCSeries.push([snap.timestamp, snap.pctCollectionTime]);
            });

            chartModel.setSeries([
                {
                    name: 'GC Avg',
                    data: avgGCSeries,
                    step: true,
                    yAxis: 0
                },
                {
                    name: 'Heap Max',
                    data: maxSeries,
                    color: '#ef6c00',
                    step: true,
                    yAxis: 1
                },
                {
                    name: 'Heap Total',
                    data: totalSeries,
                    color: '#1976d2',
                    step: true,
                    yAxis: 1
                },
                {
                    name: 'Heap Used',
                    type: 'area',
                    data: usedSeries,
                    color: '#bd7c7c',
                    fillOpacity: 0.3,
                    lineWidth: 1,
                    yAxis: 1
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

    async dumpHeapAsync() {
        try {
            const filename = await XH.prompt({
                title: 'Dump Heap',
                icon: Icon.fileArchive(),
                message: 'File Name for Dump?',
                input: {
                    rules: [required, lengthIs({min: 3, max: 30})],
                    initialValue: `${XH.appName}_${XH.getEnv('appEnvironment')}.hprof`
                }
            });
            if (!filename) return;
            await XH.fetchJson({
                url: 'memoryMonitorAdmin/dumpHeap',
                params: {filename}
            }).linkTo(this.loadModel);
            await this.loadAsync();
            XH.successToast('Heap dumped successfully to ' + filename);
        } catch (e) {
            XH.handleException(e);
        }
    }
}
