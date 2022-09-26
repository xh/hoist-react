import {boolCheckCol, GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {a} from '@xh/hoist/cmp/layout';
import {HoistModel, persist, XH} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {trimToDepth} from '@xh/hoist/utils/js';
import {compact, find, forIn, isArray, isObject, snakeCase, without} from 'lodash';
import {isObservableProp, makeObservable} from 'mobx';

const {BOOL, STRING} = FieldType;

export class ModelsModel extends HoistModel {
    persistWith = {localStorageKey: 'xhInspector.models'};

    /** @member {GridModel} */
    instancesGridModel;
    /** @member {GridModel} */
    propertiesGridModel;
    /** @member {PanelModel} */
    propertiesPanelModel;

    @bindable @persist groupModelInstancesByClass = true;
    @bindable observablePropsOnly = false;
    @bindable showUnderscoreProps = false;

    @bindable.ref propsWatchlist = [];

    /** @return {HoistModel} */
    get selectedModel() {
        const xhId = this.instancesGridModel.selectedId;
        return xhId ? XH.getActiveModels(it => it.xhId === xhId)[0] : null;
    }

    constructor() {
        super();
        makeObservable(this);

        this.instancesGridModel = this.createInstancesGridModel();
        this.propertiesGridModel = this.createPropertiesGridModel();
        this.propertiesPanelModel = new PanelModel({
            defaultSize: 500,
            side: 'right',
            persistWith: {...this.persistWith, path: 'propertiesPanel'}
        });

        this.autoLoadPropertiesGrid();

        this.addReaction(
            {
                track: () => this.instancesGridModel.store.records,
                run: () => this.instancesGridModel.preSelectFirstAsync(),
                fireImmediately: true
            },
            {
                track: () => this.groupModelInstancesByClass,
                run: (doGroupBy) => this.instancesGridModel.setGroupBy(doGroupBy ? 'className' : null)
            }
        );
    }

    selectModel(xhId) {
        const {instancesGridModel} = this,
            {store} = instancesGridModel,
            rec = store.getById(xhId);

        if (!rec) return;
        if (store.recordIsFiltered(rec)) store.clearFilter();
        instancesGridModel.selectAsync(rec);
    }

    logModelToConsole(rec) {
        const xhId = rec.id,
            model = this.getModelInstance(xhId);

        if (!model) {
            console.warn(`Model with xhId ${xhId} no longer alive - cannot be logged`);
        } else {
            const global = snakeCase(model.xhId);
            window[global] = model;
            console.log(`window.${global}`, model);
        }
    }

    logPropToConsole(rec) {
        const {xhId, property} = rec.data,
            model = this.getModelInstance(xhId);

        if (!model) {
            console.warn(`Model with xhId ${xhId} no longer alive - cannot be logged`);
        } else {
            console.log(`[${xhId}].${property}`, model[property]);
        }
    }

    togglePropsWatchlistItem(xhId, property) {
        const {propsWatchlist} = this,
            currItem = this.getWatchlistItem(xhId, property);

        this.propsWatchlist = currItem ?
            without(propsWatchlist, currItem) :
            [...propsWatchlist, {xhId, property}];
    }

    getModelInstance(xhId) {
        const matches = XH.getActiveModels(it => it.xhId === xhId);
        return matches.length ? matches[0] : null;
    }


    //------------------
    // Implementation
    //------------------
    createInstancesGridModel() {
        return new GridModel({
            persistWith: {...this.persistWith, path: 'instancesGrid'},
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
                    width: calcActionColWidth(2),
                    actions: [
                        {
                            icon: Icon.terminal(),
                            tooltip: 'Log to console',
                            actionFn: ({record}) => this.logModelToConsole(record)
                        },
                        {
                            icon: Icon.refresh({intent: 'success'}),
                            tooltip: 'Call loadAsync()',
                            actionFn: ({record}) => this.getModelInstance(record.id)?.loadAsync(),
                            displayFn: ({record}) => ({hidden: !record.data.hasLoadSupport})
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
                {
                    field: 'lastLoadCompleted',
                    displayName: 'Last Loaded',
                    align: 'right',
                    highlightOnChange: true,
                    renderer: timestampRenderer
                },
                {field: 'created', align: 'right', renderer: timestampRenderer}
            ],
            onRowDoubleClicked: ({data: rec}) => this.logModelToConsole(rec)
        });
    }

    createPropertiesGridModel() {
        const iconCol = {width: 40, align: 'center', resizable: false};
        return new GridModel({
            persistWith: {...this.persistWith, path: 'propertiesGrid'},
            sortBy: 'displayProperty',
            groupBy: 'displayGroup',
            groupSortFn: (a, b) => {
                a = a === 'Watchlist' ? 0 : 1;
                b = b === 'Watchlist' ? 0 : 1;
                return a - b;
            },
            store: {fields: ['xhId', 'property', 'isWatchlistItem']},
            columns: [
                {
                    ...actionCol,
                    width: calcActionColWidth(2),
                    actions: [
                        {
                            icon: Icon.terminal(),
                            tooltip: 'Log to console',
                            actionFn: ({record}) => this.logPropToConsole(record)
                        },
                        {
                            icon: Icon.star(),
                            tooltip: 'Toggle Watchlist',
                            actionFn: ({record}) => this.togglePropsWatchlistItem(record.data.xhId, record.data.property),
                            displayFn: ({record}) => ({
                                icon: record.data.isWatchlistItem ?
                                    Icon.star({intent: 'warning', prefix: 'fas'}) :
                                    Icon.star({className: 'xh-text-color-muted'})
                            })
                        }
                    ]
                },
                {
                    field: {name: 'displayProperty', displayName: 'Property', type: STRING},
                    width: 150,
                    renderer: (v, {record}) => {
                        return record.data.displayGroup === 'Watchlist' ?
                            a({item: v, onClick: () => this.selectModel(record.data.xhId)}) :
                            v;
                    }
                },
                {
                    field: {name: 'isHoistModel', type: BOOL},
                    headerName: Icon.database(),
                    ...iconCol,
                    renderer: v => v ? Icon.database({title: 'Hoist Model'}) : ''
                },
                {
                    field: {name: 'isObservable', type: BOOL},
                    headerName: Icon.eye(),
                    ...iconCol,
                    renderer: v => v ? Icon.eye({title: 'Observable'}) : ''
                },
                {field: 'valueType', width: 130},
                {
                    field: 'value',
                    highlightOnChange: true,
                    flex: 1,
                    minWidth: 150,
                    renderer: (v, {record}) => {
                        if (record.data.isHoistModel) {
                            return a({item: v, onClick: () => this.selectModel(v)});
                        }
                        const trimmed = isArray(v) ?
                            v.map(it => trimToDepth(it, 1)) :
                            isObject(v) ? trimToDepth(v, 1) : v;

                        return JSON.stringify(trimmed);
                    }
                },
                {field: 'displayGroup', hidden: true}
            ]
        });
    }

    autoLoadPropertiesGrid() {
        this.addAutorun({
            run: () => {
                const {propertiesGridModel, selectedModel, propsWatchlist} = this,
                    data = [];

                // Show own + prototype properties on selected model.
                if (selectedModel) {
                    forIn(selectedModel, (v, prop) => {
                        data.push(this.getRecData(selectedModel, prop));
                    });
                }

                // As well as any watchlist items.
                propsWatchlist.forEach(it => {
                    const wlModel = this.getModelInstance(it.xhId);
                    if (wlModel) {
                        data.push(this.getRecData(wlModel, it.property, true));
                    }
                });

                propertiesGridModel.loadData(compact(data));
            }
        });
    }

    getRecData(model, property, fromWatchlistItem = false) {
        const {observablePropsOnly, showUnderscoreProps} = this,
            isObservable = isObservableProp(model, property);

        if (
            (!showUnderscoreProps && property.startsWith('_')) ||
            (observablePropsOnly && !isObservable)
        ) return null;

        const v = model[property],
            modelCtor = model.constructor.name,
            {xhId} = model,
            isHoistModel = v?.isHoistModel;

        return {
            id: `${xhId}-${property}${fromWatchlistItem ? '-wl' : ''}`,
            xhId,
            property,
            value: isHoistModel ? v.xhId : v,
            valueType: v?.constructor?.name ?? typeof v,
            isObservable,
            isHoistModel,
            isWatchlistItem: !!this.getWatchlistItem(xhId, property),
            displayProperty: fromWatchlistItem ? `${modelCtor}[${xhId}].${property}` : property,
            displayGroup: fromWatchlistItem ? 'Watchlist' : modelCtor
        };
    }

    getWatchlistItem(xhId, property) {
        return find(this.propsWatchlist, {xhId, property});
    }
}

const timestampRenderer = v => fmtDate(v, {fmt: 'HH:mm:ss.SSS'});
