import {ChartModel} from '@xh/hoist/cmp/chart';
import {dateTimeCol, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, XH} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {fmtTime, numberRenderer} from '@xh/hoist/format';
import {checkMinVersion} from '@xh/hoist/utils/js';
import {forOwn, sortBy} from 'lodash';

@HoistModel
@LoadSupport
export class MemoryMonitorModel {

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
        const mbCol = {width: 150, renderer: numberRenderer({precision: 2, useCommas: true})},
            pctCol = {width: 150, renderer: numberRenderer({precision: 2, useCommas: true, label: '%'})};

        this.gridModel = new GridModel({
            sortBy: 'timestamp|desc',
            store: {
                idSpec: 'timestamp',
                fields: [
                    {name: 'timestamp', type: FieldType.DATE},
                    {name: 'totalHeapMb', displayName: 'Total (mb)', type: FieldType.NUMBER},
                    {name: 'maxHeapMb', displayName: 'Max (mb)', type: FieldType.NUMBER},
                    {name: 'freeHeapMb', displayName: 'Free (mb)', type: FieldType.NUMBER},
                    {name: 'usedHeapMb', displayName: 'Used (mb)', type: FieldType.NUMBER},
                    {name: 'usedPctTotal', displayName: 'Used (pct Total)', type: FieldType.NUMBER}
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
                        step: true,
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
                    color: '#ef6c00'
                },
                {
                    name: 'Total',
                    data: totalSeries,
                    color: '#1976d2'
                },
                {
                    name: 'Used',
                    type: 'area',
                    data: usedSeries,
                    color: '#bd7c7c',
                    fillOpacity: 0.3
                }
            ]);
        } catch (e) {
            XH.handleException(e);
        }
    }

    async requestGcAsync() {
        try {
            await XH.fetchJson({
                url: 'memoryMonitorAdmin/requestGc'
            }).linkTo(this.loadModel);

            await this.loadAsync();
            XH.toast({message: 'GC run complete'});
        } catch (e) {
            XH.handleException(e);
        }
    }

}
