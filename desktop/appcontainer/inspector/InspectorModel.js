import {ChartModel} from '@xh/hoist/cmp/chart';
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, persist, XH} from '@xh/hoist/core';
import {
    modelInstancePanel
} from '@xh/hoist/desktop/appcontainer/inspector/widgets/ModelInstancePanel';
import {statsPanel} from '@xh/hoist/desktop/appcontainer/inspector/widgets/StatsPanel';
import {DashContainerModel} from '@xh/hoist/desktop/cmp/dash';
import {actionCol} from '@xh/hoist/desktop/cmp/grid';
import {dateRenderer, dateTimeSecRenderer, numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {makeObservable} from 'mobx';

export class InspectorModel extends HoistModel {
    persistWith = {localStorageKey: 'xhInspectorModel'};

    /** @member {DashContainerModel} */
    @managed dashContainerModel;

    /** @member {GridModel} */
    @managed modelInstanceGridModel;

    /** @member {GridModel} */
    @managed statsGridModel;
    /** @member {ChartModel} */
    @managed statsChartModel;

    @bindable @persist groupModelInstancesByClass = true;

    get enabled() {
        return XH.inspectorService.enabled;
    }

    constructor() {
        super();
        makeObservable(this);

        this.dashContainerModel = new DashContainerModel({
            showMenuButton: true,
            persistWith: {...this.persistWith},
            viewSpecDefaults: {unique: true},
            viewSpecs: [
                {
                    id: 'stats',
                    icon: Icon.chartLine(),
                    content: statsPanel
                },
                {
                    id: 'modelInstances',
                    icon: Icon.cube(),
                    content: modelInstancePanel
                }
            ]
        });

        this.modelInstanceGridModel = new GridModel({
            persistWith: {...this.persistWith, path: 'modelInstanceGrid'},
            store: XH.inspectorService.modelInstanceStore,
            sortBy: ['created|desc'],
            groupBy: this.groupModelInstancesByClass ? 'className' : null,
            filterModel: true,
            colDefaults: {filterable: true},
            columns: [
                {
                    ...actionCol,
                    actions: [
                        {icon: Icon.terminal(), tooltip: 'Log to console', actionFn: ({record}) => this.logModelToConsole(record)},
                        {icon: Icon.refresh(), tooltip: 'Call loadAsync()',
                            actionFn: ({record}) => this.getModelInstance(record.id)?.loadAsync(),
                            displayFn: ({record}) => {
                                const {hasLoadSupport} = record.data;
                                return {
                                    disabled: !hasLoadSupport,
                                    icon: hasLoadSupport ? Icon.refresh({intent: 'success'}) : Icon.refresh()
                                };
                            }
                        }
                    ]
                },
                {field: 'id', displayName: 'Model xhId', width: 120},
                {field: 'className', flex: 1},
                {field: 'lastLoadCompleted', displayName: 'Last Loaded', width: 225, align: 'right', renderer: dateTimeSecRenderer()},
                {field: 'created', width: 225, align: 'right', renderer: dateTimeSecRenderer()}
            ],
            onRowDoubleClicked: ({data: rec}) => this.logModelToConsole(rec)
        });

        this.statsGridModel = new GridModel({
            store: XH.inspectorService.statsStore,
            autosizeOptions: {mode: GridAutosizeMode.MANAGED},
            sortBy: ['timestamp|desc'],
            columns: [
                {field: 'timestamp', renderer: dateRenderer({fmt: 'h:mm:ssa'})},
                {field: 'modelCount', renderer: numberRenderer()},
                {field: 'totalJSHeapSize', renderer: numberRenderer()},
                {field: 'usedJSHeapSize', renderer: numberRenderer()}
            ]
        });

        this.statsChartModel = new ChartModel({
            highchartsConfig: {
                chart: {animation: false},
                plotOptions: {
                    area: {width: 1, animation: false}
                },
                // legend: {enabled: false},
                title: {text: null},
                xAxis: {type: 'datetime'},
                yAxis: [
                    {title: {text: '# Models'}, allowDecimals: false, opposite: true},
                    {title: {text: 'Heap KB'}}
                ]
            }
        });

        this.addReaction(
            {
                track: () => this.groupModelInstancesByClass,
                run: (doGroupBy) => this.modelInstanceGridModel.setGroupBy(doGroupBy ? 'className' : null)
            },
            {
                track: () => this.statsGridModel.store.allRecords,
                run: () => this.updateStatsChartModel(),
                fireImmediately: true
            }
        );
    }

    logModelToConsole(rec) {
        const model = this.getModelInstance(rec.id);

        model ?
            console.log(model) :
            console.warn(`Model with xhId ${rec.id} no longer alive - cannot be logged`);
    }

    getModelInstance(xhId) {
        const matches = XH.getActiveModels(it => it.xhId === xhId);
        return matches.length ? matches[0] : null;
    }

    updateStatsChartModel() {
        const {allRecords} = XH.inspectorService.statsStore,
            modelCountData = [],
            usedHeapData = [];

        allRecords.forEach(rec => {
            const {timestamp, modelCount, usedJSHeapSize} = rec.data;
            modelCountData.push([timestamp, modelCount]);
            usedHeapData.push([timestamp, usedJSHeapSize]);
        });

        this.statsChartModel.setSeries([
            {type: 'area', name: '# Models', data: modelCountData, yAxis: 0},
            {type: 'line', name: 'Used Heap (kb)', data: usedHeapData, yAxis: 1}
        ]);
    }

}
