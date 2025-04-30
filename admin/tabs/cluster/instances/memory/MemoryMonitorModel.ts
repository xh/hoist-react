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
import {ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {LoadSpec, managed, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {fmtTime, numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {forOwn, orderBy, sortBy} from 'lodash';

export interface PastInstance {
    name: string;
    lastUpdated: number;
}

export class MemoryMonitorModel extends BaseInstanceModel {
    @managed gridModel: GridModel;
    @managed chartModel: ChartModel;

    @bindable.ref pastInstance: PastInstance = null;
    @observable.ref pastInstances: PastInstance[] = [];

    get enabled(): boolean {
        return this.conf.enabled;
    }

    get heapDumpDir(): string {
        return this.conf.heapDumpDir;
    }

    constructor() {
        super();
        makeObservable(this);
        this.gridModel = this.createGridModel();
        this.chartModel = this.createChartModel();
        this.addReaction({
            track: () => this.pastInstance,
            run: () => this.loadAsync()
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            await this.loadDataAsync(loadSpec);
            await this.loadPastInstancesAsync(loadSpec);
        } catch (e) {
            this.handleLoadException(e, loadSpec);
        }
    }

    async takeSnapshotAsync() {
        try {
            await XH.fetchJson({
                url: 'memoryMonitorAdmin/takeSnapshot',
                params: {instance: this.instanceName}
            }).linkTo(this.loadModel);
            await this.loadAsync();
            XH.successToast('Updated snapshot loaded');
        } catch (e) {
            XH.handleException(e);
        }
    }

    async requestGcAsync() {
        try {
            await XH.fetchJson({
                url: 'memoryMonitorAdmin/requestGc',
                params: {instance: this.instanceName}
            }).linkTo(this.loadModel);
            await this.loadAsync();
            XH.successToast('GC run complete');
        } catch (e) {
            XH.handleException(e);
        }
    }

    async dumpHeapAsync() {
        try {
            const appEnv = XH.getEnv('appEnvironment').toLowerCase(),
                filename = await XH.prompt<string>({
                    title: 'Dump Heap',
                    icon: Icon.fileArchive(),
                    message: `Specify a filename for the heap dump (to be saved in ${this.heapDumpDir})`,
                    input: {
                        rules: [required, lengthIs({min: 3, max: 250})],
                        initialValue: `${XH.appCode}_${appEnv}_${Date.now()}.hprof`
                    }
                });
            if (!filename) return;
            await XH.fetchJson({
                url: 'memoryMonitorAdmin/dumpHeap',
                params: {
                    instance: this.instanceName,
                    filename
                }
            }).linkTo(this.loadModel);
            await this.loadAsync();
            XH.successToast('Heap dumped successfully to ' + filename);
        } catch (e) {
            XH.handleException(e);
        }
    }

    //-------------------
    // Implementation
    //-------------------
    private createGridModel(): GridModel {
        return new GridModel({
            enableExport: true,
            exportOptions: {filename: exportFilenameWithDate('memory-monitor')},
            filterModel: true,
            sortBy: 'timestamp|desc',
            store: {idSpec: 'timestamp'},
            colDefaults: {filterable: true},
            headerMenuDisplay: 'hover',
            columns: [
                {...timestampNoYear},
                {
                    groupId: 'heap',
                    headerAlign: 'center',
                    children: [totalHeapMb, maxHeapMb, freeHeapMb, usedHeapMb, usedPctMax]
                },
                {
                    groupId: 'GC',
                    headerName: 'Garbage Collection',
                    headerAlign: 'center',
                    children: [collectionCount, avgCollectionTime, pctCollectionTime]
                }
            ]
        });
    }

    private createChartModel(): ChartModel {
        return new ChartModel({
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
                        title: {text: 'Heap (mb)'},
                        offset: 0
                    }
                ],
                tooltip: {outside: true, shared: true}
            }
        });
    }

    private async loadDataAsync(loadSpec: LoadSpec) {
        const {gridModel, chartModel, pastInstance} = this;

        const action = pastInstance ? `snapshotsForPastInstance` : 'snapshots',
            instance = pastInstance ? pastInstance.name : this.instanceName;
        const snapsByTimestamp = await XH.fetchJson({
            url: 'memoryMonitorAdmin/' + action,
            params: {instance},
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
            avgGCSeries = [];

        snaps.forEach(snap => {
            maxSeries.push([snap.timestamp, snap.maxHeapMb]);
            totalSeries.push([snap.timestamp, snap.totalHeapMb]);
            usedSeries.push([snap.timestamp, snap.usedHeapMb]);

            avgGCSeries.push([snap.timestamp, snap.avgCollectionTime]);
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
    }

    private async loadPastInstancesAsync(loadSpec: LoadSpec) {
        const instances = await XH.fetchJson({
            url: 'memoryMonitorAdmin/availablePastInstances',
            loadSpec
        });
        runInAction(() => {
            this.pastInstances = orderBy(instances, ['lastUpdated'], ['desc']);
        });
    }

    private get conf() {
        return XH.getConf('xhMemoryMonitoringConfig', {heapDumpDir: null, enabled: true});
    }
}

const mbCol = {width: 150, renderer: numberRenderer({precision: 2, withCommas: true})},
    pctCol = {width: 150, renderer: numberRenderer({precision: 2, withCommas: true, label: '%'})},
    msCol = {width: 150, renderer: numberRenderer({precision: 0, withCommas: false})};

export const totalHeapMb: ColumnSpec = {
    field: {
        name: 'totalHeapMb',
        type: 'number',
        displayName: 'Total (mb)'
    },
    ...mbCol
};

export const maxHeapMb: ColumnSpec = {
    field: {
        name: 'maxHeapMb',
        type: 'number',
        displayName: 'Max (mb)'
    },
    ...mbCol
};

export const freeHeapMb: ColumnSpec = {
    field: {
        name: 'freeHeapMb',
        type: 'number',
        displayName: 'Free (mb)'
    },
    ...mbCol
};

export const usedHeapMb: ColumnSpec = {
    field: {
        name: 'usedHeapMb',
        type: 'number',
        displayName: 'Used (mb)'
    },
    ...mbCol
};

export const usedPctMax: ColumnSpec = {
    field: {
        name: 'usedPctMax',
        type: 'number',
        displayName: 'Used (% Max)'
    },
    ...pctCol
};

export const avgCollectionTime: ColumnSpec = {
    field: {
        name: 'avgCollectionTime',
        type: 'number',
        displayName: 'Avg (ms)'
    },
    ...msCol
};

export const collectionCount: ColumnSpec = {
    field: {
        name: 'collectionCount',
        type: 'number',
        displayName: '# GCs'
    },
    ...msCol
};

export const pctCollectionTime: ColumnSpec = {
    field: {
        name: 'pctCollectionTime',
        type: 'number',
        displayName: '% Time in GC'
    },
    ...pctCol
};
