import {boolCheckCol, GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {a} from '@xh/hoist/cmp/layout';
import {HoistModel, persist, XH} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {action, bindable} from '@xh/hoist/mobx';
import {trimToDepth} from '@xh/hoist/utils/js';
import {compact, find, forIn, head, without} from 'lodash';
import {isObservableProp, makeObservable} from 'mobx';

const {BOOL, STRING} = FieldType;

/**
 * Displays a list of current HoistModel and HoistService instances, with the ability to view
 * properties (including reactive updates) for a selected instance.
 */
export class ModelsModel extends HoistModel {
    persistWith = {localStorageKey: `xhInspector.${XH.clientAppCode}.models`};

    /** @member {GridModel} */
    instancesGridModel;
    /** @member {GridModel} */
    propertiesGridModel;
    /** @member {PanelModel} */
    propertiesPanelModel;

    @bindable @persist showInGroups = true;
    @bindable observablePropsOnly = false;
    @bindable showUnderscoreProps = false;

    @bindable.ref propsWatchlist = [];
    @bindable.ref loadedGetters = [];

    /** @return {HoistModel|HoistService} */
    get selectedInstance() {
        return this.getInstance(this.instancesGridModel.selectedId);
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
                track: () => this.showInGroups,
                run: (showInGroups) => this.instancesGridModel.setGroupBy(showInGroups ? 'displayGroup' : null)
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

    logInstanceToConsole(rec) {
        if (!rec) return;

        const xhId = rec.id,
            instance = this.getInstance(xhId);

        if (!instance) {
            console.warn(`Model with xhId ${xhId} no longer alive - cannot be logged`);
        } else {
            console.log(`[${xhId}]`, instance);
            XH.toast({
                icon: Icon.terminal(),
                message: `Logged ${rec.data.className} ${xhId} to devtools console`
            });
        }
    }

    logPropToConsole(rec) {
        const {xhId, property} = rec.data,
            instance = this.getInstance(xhId);

        if (!instance) {
            console.warn(`Model with xhId ${xhId} no longer alive - cannot be logged`);
        } else {
            console.log(`[${xhId}].${property}`, instance[property]);
            XH.toast({
                icon: Icon.terminal(),
                message: `Logged [${xhId}].${property} to devtools console`
            });
        }
    }

    togglePropsWatchlistItem(record) {
        const {xhId, property, isGetter} = record.data,
            {propsWatchlist} = this,
            currItem = this.getWatchlistItem(xhId, property);

        this.propsWatchlist = currItem ?
            without(propsWatchlist, currItem) :
            [...propsWatchlist, {xhId, property, isGetter}];
    }

    getInstance(xhId) {
        if (!xhId) return null;
        return head(XH.getActiveModels(it => it.xhId === xhId)) ?? XH.getServices().find(it => it.xhId === xhId);
    }


    //------------------
    // Implementation
    //------------------
    createInstancesGridModel() {
        return new GridModel({
            persistWith: {...this.persistWith, path: 'instancesGrid', persistGrouping: false},
            autosizeOptions: {mode: GridAutosizeMode.MANAGED},
            store: XH.inspectorService.modelInstanceStore,
            sortBy: ['created'],
            groupBy: this.showInGroups ? 'displayGroup' : null,
            groupSortFn: (a, b) => {
                a = a === 'Services' ? '!' : a;
                b = b === 'Services' ? '!' : b;
                return this.instancesGridModel.defaultGroupSortFn(a, b);
            },
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
                            actionFn: ({record}) => this.logInstanceToConsole(record)
                        },
                        {
                            icon: Icon.refresh({intent: 'success'}),
                            tooltip: 'Call loadAsync()',
                            actionFn: ({record}) => this.getInstance(record.id)?.loadAsync(),
                            displayFn: ({record}) => ({hidden: !record.data.hasLoadSupport})
                        }
                    ]
                },
                {field: 'id', displayName: 'xhId'},
                {
                    field: 'isLinked',
                    ...boolCheckCol,
                    tooltip: v => v ? 'Linked model' : '',
                    renderer: (v) => v ? Icon.link() : null
                },
                {field: 'displayGroup', hidden: true},
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
            onRowDoubleClicked: ({data: rec}) => this.logInstanceToConsole(rec)
        });
    }

    createPropertiesGridModel() {
        const iconCol = {width: 40, align: 'center', resizable: false};
        return new GridModel({
            persistWith: {...this.persistWith, path: 'propertiesGrid'},
            autosizeOptions: {mode: GridAutosizeMode.MANAGED},
            emptyText: 'No properties found.',
            sortBy: 'displayProperty',
            groupBy: 'displayGroup',
            groupSortFn: (a, b) => {
                a = a === 'Watchlist' ? 0 : 1;
                b = b === 'Watchlist' ? 0 : 1;
                return a - b;
            },
            store: {fields: ['xhId', 'property', 'isWatchlistItem', 'isHoistModel', 'isGetter', 'isLoadedGetter']},
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
                            actionFn: ({record}) => this.togglePropsWatchlistItem(record),
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
                    width: 200,
                    renderer: (v, {record}) => {
                        return record.data.displayGroup === 'Watchlist' ?
                            a({item: v, onClick: () => this.selectModel(record.data.xhId)}) :
                            v;
                    }
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
                    cellClass: 'xh-font-family-mono',
                    flex: 1,
                    minWidth: 150,
                    highlightOnChange: true,
                    rendererIsComplex: true,
                    renderer: (v, {record}) => {
                        const {data} = record;
                        if (data.isGetter && !data.isLoadedGetter) {
                            return a({item: '(...)', onClick: () => this.loadGetter(record)});
                        }
                        if (data.isHoistModel) {
                            return a({item: v, onClick: () => this.selectModel(v)});
                        }
                        return JSON.stringify(trimToDepth(v, 2));
                    }
                },
                {field: 'displayGroup', hidden: true}
            ],
            onRowDoubleClicked: ({data: rec}) => this.logPropToConsole(rec)
        });
    }

    autoLoadPropertiesGrid() {
        this.addAutorun({
            run: () => {
                const {propertiesGridModel, selectedInstance, propsWatchlist} = this,
                    data = [];

                // Read properties (included non-enumerated ones, like getters) off of the instance and its prototype.
                if (selectedInstance) {
                    const descriptors = {
                        ...Object.getOwnPropertyDescriptors(selectedInstance),
                        ...Object.getOwnPropertyDescriptors(Object.getPrototypeOf(selectedInstance))
                    };

                    forIn(descriptors, (descriptor, prop) => {
                        // Extract data from enumerable props and getters.
                        if (descriptor.enumerable || descriptor.get) {
                            data.push(this.getRecData({
                                model: selectedInstance,
                                property: prop,
                                isGetter: !!descriptor.get
                            }));
                        }
                    });
                }

                // As well as any watchlist items.
                propsWatchlist.forEach(it => {
                    const wlModel = this.getInstance(it.xhId);
                    if (wlModel) {
                        data.push(this.getRecData({
                            model: wlModel,
                            property: it.property,
                            fromWatchlistItem: true,
                            isGetter: it.isGetter
                        }));
                    }
                });

                propertiesGridModel.loadData(compact(data));
            },
            delay: 300
        });
    }

    getRecData({model, property, fromWatchlistItem = false, isGetter = false}) {
        const {observablePropsOnly, showUnderscoreProps} = this,
            isObservable = isObservableProp(model, property);

        if (
            (!showUnderscoreProps && property.startsWith('_')) ||
            (observablePropsOnly && !isObservable)
        ) return null;

        const {xhId} = model,
            modelCtor = model.constructor.name,
            isLoadedGetter = isGetter && this.shouldLoadGetter(xhId, property),
            v = (!isGetter || isLoadedGetter) ? model[property] : null,
            isHoistModel = v?.isHoistModel;

        const valueType = (isGetter && !isLoadedGetter) ?
            'get(?)' :
            v?.constructor?.name ?? typeof v;

        return {
            id: `${xhId}-${property}${fromWatchlistItem ? '-wl' : ''}`,
            xhId,
            property,
            value: isHoistModel ? v.xhId : v,
            valueType,
            isObservable,
            isHoistModel,
            isGetter,
            isLoadedGetter,
            isWatchlistItem: !!this.getWatchlistItem(xhId, property),
            displayProperty: fromWatchlistItem ? `${modelCtor}[${xhId}].${property}` : property,
            displayGroup: fromWatchlistItem ? 'Watchlist' : modelCtor
        };
    }

    shouldLoadGetter(xhId, property) {
        return !!find(this.loadedGetters, {xhId, property});
    }

    loadGetter(rec) {
        const {xhId, property} = rec.data;
        if (!this.shouldLoadGetter(xhId, property)) {
            this.setLoadedGetters([...this.loadedGetters, {xhId, property}]);
        }
    }

    @action
    loadAllCurrentGetters() {
        this.propertiesGridModel.store.records.forEach(rec => {
            const {isGetter, isLoadedGetter} = rec.data;
            if (isGetter && !isLoadedGetter) this.loadGetter(rec);
        });
    }

    getWatchlistItem(xhId, property) {
        return find(this.propsWatchlist, {xhId, property});
    }
}

const timestampRenderer = v => fmtDate(v, {fmt: 'HH:mm:ss.SSS'});
