import {ChartModel} from '@xh/hoist/cmp/chart';
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, XH} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDate, numberRenderer} from '@xh/hoist/format';

const {NUMBER} = FieldType;

/**
 * Displays a small grid/chart combo with a timeseries of the app's model count and memory usage.
 */
export class StatsModel extends HoistModel {
    xhImpl = true;

    persistWith = {localStorageKey: `xhInspector.${XH.clientAppCode}.stats`};

    /** @member {PanelModel} */
    panelModel;
    /** @member {GridModel} */
    gridModel;
    /** @member {ChartModel} */
    chartModel;

    /** @return {number} */
    get selectedSyncRun() {
        return this.gridModel.selectedRecord?.data.syncRun;
    }

    constructor() {
        super();

        this.panelModel = new PanelModel({
            side: 'left',
            defaultSize: 450,
            persistWith: this.persistWith,
            xhImpl: true
        });

        this.gridModel = new GridModel({
            colChooser: true,
            persistWith: this.persistWith,
            autosizeOptions: {mode: GridAutosizeMode.MANAGED},
            store: {
                fields: [
                    {name: 'timestamp', displayName: 'Time', type: NUMBER},
                    {name: 'syncRun', displayName: 'Sync', type: NUMBER},
                    {name: 'modelCount', displayName: '# Models', type: NUMBER},
                    {name: 'modelCountChange', displayName: '#Δ', type: NUMBER},
                    {name: 'totalJSHeapSize', type: NUMBER},
                    {name: 'usedJSHeapSize', type: NUMBER}
                ]
            },
            sortBy: ['timestamp|desc'],
            colDefaults: {autosizeIncludeHeaderIcons: false},
            columns: [
                {field: 'timestamp', renderer: timestampRenderer},
                {field: 'modelCount', renderer: numberRenderer({precision: 0})},
                {field: 'syncRun', renderer: numberRenderer({precision: 0})},
                {field: 'modelCountChange', renderer: numberRenderer({precision: 0, colorSpec: true, withSignGlyph: true})},
                {field: 'usedJSHeapSize', displayName: 'Heap used/total', rendererIsComplex: true, renderer: (v, {record}) => {
                    const used = Math.round(v/1000000),
                        total = Math.round(record.data.totalJSHeapSize/1000000);
                    return `${used}/${total}mb`;
                }}
            ],
            xhImpl: true
        });

        this.chartModel = new ChartModel({
            highchartsConfig: {
                chart: {zoomType: 'x'},
                legend: {enabled: false},
                title: {text: null},
                xAxis: {type: 'datetime'},
                yAxis: [
                    {title: {text: '# Models'}, allowDecimals: false, opposite: true, height: '70%'},
                    {title: {text: 'Used JS Heap (mb)'}, height: '70%'},
                    {
                        title: {text: '#Δ'}, height: '20%', top: '80%', offset: 0, opposite: true,
                        plotLines: [
                            {
                                value: 0,
                                color: XH.darkTheme ? '#37474f' : '#bdbdbd'
                            }
                        ]
                    }
                ]
            },
            xhImpl: true
        });

        this.addReaction(
            {
                track: () => XH.inspectorService.stats,
                run: (stats) => {
                    this.gridModel.loadData(stats);
                    this.updateChartModel();
                },
                fireImmediately: true
            }
        );
    }

    updateChartModel() {
        const {stats} = XH.inspectorService,
            modelCountData = [],
            modelCountChangeData = [],
            usedHeapData = [];

        stats.forEach(stat => {
            const {timestamp, modelCount, modelCountChange, usedJSHeapSize} = stat;
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
