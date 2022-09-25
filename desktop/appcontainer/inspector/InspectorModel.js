import {ChartModel} from '@xh/hoist/cmp/chart';
import {boolCheckCol, GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, persist, XH} from '@xh/hoist/core';
import {actionCol} from '@xh/hoist/desktop/cmp/grid';
import {fmtDate, numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {snakeCase} from 'lodash';
import {makeObservable} from 'mobx';

export class InspectorModel extends HoistModel {
    persistWith = {localStorageKey: 'xhInspectorModel'};

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

    /** @return {HoistModel} */
    get selectedModel() {
        const xhId = this.modelInstanceGridModel.selectedId;
        return xhId ? XH.getActiveModels(it => it.xhId === xhId)[0] : null;
    }

    constructor() {
        super();
        makeObservable(this);

        this.modelInstanceGridModel = new GridModel({
            persistWith: {...this.persistWith, path: 'modelInstanceGrid'},
            autosizeOptions: {mode: GridAutosizeMode.MANAGED},
            store: XH.inspectorService.modelInstanceStore,
            sortBy: ['created|desc'],
            groupBy: this.groupModelInstancesByClass ? 'className' : null,
            filterModel: true,
            colChooserModel: true,
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
                {field: 'id', displayName: 'Model xhId'},
                {
                    field: 'isLinked',
                    ...boolCheckCol,
                    tooltip: v => v ? 'Linked model' : '',
                    renderer: (v) => v ? Icon.link() : null
                },
                {field: 'className', flex: 1, minWidth: 150},
                {field: 'lastLoadCompleted', displayName: 'Last Loaded', align: 'right', highlightOnChange: true, renderer: timestampRenderer},
                {field: 'created', align: 'right', renderer: timestampRenderer}
            ],
            onRowDoubleClicked: ({data: rec}) => this.logModelToConsole(rec)
        });

        this.statsGridModel = new GridModel({
            autosizeOptions: {mode: GridAutosizeMode.MANAGED},
            store: XH.inspectorService.statsStore,
            sortBy: ['timestamp|desc'],
            columns: [
                {field: 'timestamp', renderer: timestampRenderer},
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
                track: () => this.modelInstanceGridModel.store.records,
                run: () => this.modelInstanceGridModel.preSelectFirstAsync(),
                fireImmediately: true
            },
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

    selectModel(xhId) {
        const gridModel = this.modelInstanceGridModel,
            {store} = gridModel,
            rec = store.getById(xhId);

        if (!rec) return;
        if (store.recordIsFiltered(rec)) store.clearFilter();
        gridModel.selectAsync(rec);
    }

    logModelToConsole(rec) {
        const model = this.getModelInstance(rec.id);
        if (!model) {
            console.warn(`Model with xhId ${rec.id} no longer alive - cannot be logged`);
        } else {
            const global = snakeCase(model.xhId);
            window[global] = model;
            console.log(`window.${global}`, model);
        }
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

const timestampRenderer = v => fmtDate(v, {fmt: 'hh:mm:ss'});
