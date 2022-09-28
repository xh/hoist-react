import {ChartModel} from '@xh/hoist/cmp/chart';
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, XH} from '@xh/hoist/core';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDate, millionsRenderer, numberRenderer} from '@xh/hoist/format';

export class StatsModel extends HoistModel {
    persistWith = {localStorageKey: 'xhInspector.stats'};

    /** @member {PanelModel} */
    panelModel;
    /** @member {GridModel} */
    gridModel;
    /** @member {ChartModel} */
    chartModel;

    constructor() {
        super();

        this.panelModel = new PanelModel({
            side: 'left',
            defaultSize: 500,
            persistWith: this.persistWith
        });

        this.gridModel = new GridModel({
            colChooser: true,
            persistWith: this.persistWith,
            autosizeOptions: {mode: GridAutosizeMode.MANAGED},
            store: XH.inspectorService.statsStore,
            sortBy: ['timestamp|desc'],
            columns: [
                {field: 'timestamp', displayName: 'Time', renderer: timestampRenderer},
                {field: 'modelCount', displayName: '# Models', renderer: numberRenderer({precision: 0})},
                {field: 'modelCountChange', displayName: '#Δ', renderer: numberRenderer({precision: 0, ledger: true})},
                {field: 'totalJSHeapSize', displayName: 'JS Heap (mb)', renderer: millionsRenderer({precision: 0})},
                {field: 'usedJSHeapSize', displayName: 'Used (mb)', renderer: millionsRenderer({precision: 0})}
            ]
        });

        this.chartModel = new ChartModel({
            highchartsConfig: {
                chart: {zoomType: 'x'},
                legend: {enabled: false},
                title: {text: null},
                xAxis: {type: 'datetime'},
                yAxis: [
                    {title: {text: '# Models'}, allowDecimals: false, opposite: true, height: '70%'},
                    {title: {text: 'JS Heap'}, height: '70%'},
                    {title: {text: '#Δ'}, height: '20%', top: '80%', offset: 0, opposite: true}
                ]
            }
        });

        this.addReaction(
            {
                track: () => this.gridModel.store.allRecords,
                run: () => this.updateChartModel(),
                fireImmediately: true
            }
        );
    }

    updateChartModel() {
        const {allRecords} = XH.inspectorService.statsStore,
            modelCountData = [],
            modelCountChangeData = [],
            usedHeapData = [];

        allRecords.forEach(rec => {
            const {timestamp, modelCount, modelCountChange, usedJSHeapSize} = rec.data;
            modelCountData.push([timestamp, modelCount]);
            modelCountChangeData.push({
                x: timestamp,
                y: modelCountChange,
                color: modelCountChange > 0 ? '#6c8d6d' : '#bd7c7c'
            });
            usedHeapData.push([timestamp, usedJSHeapSize/1000000]);
        });

        this.chartModel.setSeries([
            {type: 'area', name: '# Models', data: modelCountData, yAxis: 0},
            {type: 'line', name: 'Used Heap (mb)', data: usedHeapData, yAxis: 1, color: '#DD7D08FF'},
            {type: 'column', name: '#Δ', data: modelCountChangeData, yAxis: 2, borderWidth: 0}
        ]);
    }
}

const timestampRenderer = v => fmtDate(v, {fmt: 'HH:mm:ss'});
