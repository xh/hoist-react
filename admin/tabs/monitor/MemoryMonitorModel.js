import {ChartModel} from '@xh/hoist/cmp/chart';
import {dateTimeCol, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, XH} from '@xh/hoist/core';
import {fmtTime, numberRenderer} from '@xh/hoist/format';
import {checkMinVersion} from '@xh/hoist/utils/js';
import {forOwn, sortBy} from 'lodash';

export class MemoryMonitorModel extends HoistModel {

    /** @member {GridModel} */
    gridModel;
    /** @member {ChartModel} */
    chartModel;

    get minVersionWarning() {
        const minVersion = '8.7.0',
            currVersion = XH.environmentService.get('hoistCoreVersion');
        return checkMinVersion(currVersion, minVersion) ? null : `This feature requires Hoist Core v${minVersion} or greater.`;
    }

    constructor() {
        super();
        const mbCol = {width: 150, renderer: numberRenderer({precision: 2, useCommas: true})},
            pctCol = {width: 150, renderer: numberRenderer({precision: 2, useCommas: true, label: '%'})};

        this.gridModel = new GridModel({
            sortBy: 'timestamp|desc',
            enableExport: true,
            store: {
                idSpec: 'timestamp',
                fields: [
                    {name: 'timestamp', type: 'date'},
                    {name: 'totalHeapMb', type: 'number', displayName: 'Total (mb)'},
                    {name: 'maxHeapMb', type: 'number', displayName: 'Max (mb)'},
                    {name: 'freeHeapMb', type: 'number', displayName: 'Free (mb)'},
                    {name: 'usedHeapMb', type: 'number', displayName: 'Used (mb)'},
                    {name: 'usedPctTotal', type: 'number', displayName: 'Used (pct Total)'}
                ]
            },
            columns: [
                {field: 'timestamp', ...dateTimeCol},
                {field: 'totalHeapMb', ...mbCol},
                {field: 'maxHeapMb', ...mbCol},
                {field: 'freeHeapMb', ...mbCol},
                {field: 'usedHeapMb', ...mbCol},
                {field: 'usedPctTotal', ...pctCol}
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
