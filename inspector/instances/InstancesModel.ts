/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {boolCheckCol, ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {a} from '@xh/hoist/cmp/layout';
import {HoistBase, hoistCmp, HoistModel, persist, XH} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, isObservableProp, makeObservable, runInAction} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {trimToDepth} from '@xh/hoist/utils/js';
import {compact, find, forIn, head, without} from 'lodash';
import {StatsModel} from '../stats/StatsModel';

/**
 * Displays a list of current HoistModel, HoistService, and Store instances, with the ability to
 * view properties (including reactive updates) for a selected instance.
 */
export class InstancesModel extends HoistModel {
    override xhImpl = true;

    override persistWith = {localStorageKey: `xhInspector.${XH.clientAppCode}.instances`};

    instancesGridModel: GridModel;
    propertiesGridModel: GridModel;
    instancesPanelModel: PanelModel;

    get statsModel(): StatsModel {
        return XH.getModels(StatsModel)[0] as StatsModel;
    }

    get selectedSyncRun() {
        return this.statsModel?.selectedSyncRun;
    }

    @bindable.ref propsWatchlist = [];
    @bindable.ref loadedGetters = [];

    // Persisted storeFilterFields (convenient across frequent page refreshes when developing)
    @bindable @persist instancesStoreFilter;
    @bindable @persist propertiesStoreFilter;

    @bindable @persist instQuickFilters = ['showInGroups'];
    get showInGroups() {
        return this.instQuickFilters?.includes('showInGroups');
    }
    get showXhImpl() {
        return this.instQuickFilters?.includes('showXhImpl');
    }

    @bindable @persist propQuickFilters = [];
    get showUnderscoreProps() {
        return this.propQuickFilters?.includes('showUnderscoreProps');
    }
    get observablePropsOnly() {
        return this.propQuickFilters?.includes('observablePropsOnly');
    }
    get ownPropsOnly() {
        return this.propQuickFilters?.includes('ownPropsOnly');
    }

    get selectedInstances(): HoistBase[] {
        return this.instancesGridModel.selectedIds.map((it: string) => this.getInstance(it));
    }

    constructor() {
        super();
        makeObservable(this);

        this.instancesGridModel = this.createInstancesGridModel();
        this.propertiesGridModel = this.createPropertiesGridModel();
        this.instancesPanelModel = new PanelModel({
            defaultSize: 575,
            side: 'left',
            collapsible: false,
            persistWith: {...this.persistWith, path: 'instancesPanel'}
        });

        this.addReaction(
            {
                track: () => this.instancesGridModel.selectedIds,
                run: ids => {
                    this.propertiesGridModel.emptyText = ids.length
                        ? 'No matching properties found.'
                        : 'Select an instance to view properties.';
                },
                delay: 300,
                fireImmediately: true
            },
            {
                track: () => this.showInGroups,
                run: showInGroups =>
                    this.instancesGridModel.setGroupBy(showInGroups ? 'displayGroup' : null)
            }
        );

        this.autoLoadInstancesGrid();
        this.autoLoadPropertiesGrid();
    }

    async selectInstanceAsync(xhId: string) {
        const inst = this.getInstance(xhId);

        if (inst.xhImpl && !this.showXhImpl) {
            runInAction(() => {
                this.instQuickFilters = [...this.instQuickFilters, 'showXhImpl'];
            });
            await wait();
        }

        const {instancesGridModel} = this,
            {store} = instancesGridModel,
            rec = store.getById(xhId);

        if (!rec) return;
        if (store.recordIsFiltered(rec)) store.clearFilter();
        await instancesGridModel.selectAsync(rec);
    }

    logInstanceToConsole(rec: StoreRecord) {
        if (!rec) return;

        const xhId = rec.id as string,
            instance = this.getInstance(xhId);

        if (!instance) {
            console.warn(`Instance with xhId ${xhId} no longer alive - cannot be logged`);
        } else {
            console.log(`[${xhId}]`, instance);
            XH.toast({
                icon: Icon.terminal(),
                message: `Logged ${rec.data.className} ${xhId} to devtools console`
            });
        }
    }

    logPropToConsole(rec: StoreRecord) {
        if (!rec) return;

        const {instanceXhId, instanceDisplayName, property} = rec.data,
            instance = this.getInstance(instanceXhId);

        if (!instance) {
            console.warn(`Instance ${instanceDisplayName} no longer alive - cannot be logged`);
        } else {
            console.log(`[${instanceDisplayName}].${property}`, instance[property]);
            XH.toast({
                icon: Icon.terminal(),
                message: `Logged [${instanceDisplayName}].${property} to devtools console`
            });
        }
    }

    togglePropsWatchlistItem(record: StoreRecord) {
        const {instanceXhId, property, isGetter} = record.data,
            {propsWatchlist} = this,
            currItem = this.getWatchlistItem(instanceXhId, property);

        this.propsWatchlist = currItem
            ? without(propsWatchlist, currItem)
            : [...propsWatchlist, {instanceXhId, property, isGetter}];
    }

    getInstance(xhId: string): HoistBase {
        if (!xhId) return null;
        return (
            head(XH.getModels(it => it.xhId === xhId)) ??
            XH.getServices().find(it => it.xhId === xhId) ??
            XH.getStores().find(it => it.xhId === xhId)
        );
    }

    //------------------
    // Implementation
    //------------------
    private createInstancesGridModel() {
        return new GridModel({
            persistWith: {...this.persistWith, path: 'instancesGrid', persistGrouping: false},
            autosizeOptions: {mode: 'managed'},
            emptyText: 'No matching (and alive) instances found.',
            store: {
                fields: [
                    {name: 'className', type: 'string'},
                    {name: 'displayGroup', type: 'string'},
                    {name: 'created', type: 'date'},
                    {name: 'syncRun', type: 'number'},
                    {name: 'isHoistService', type: 'bool'},
                    {name: 'isHoistModel', type: 'bool'},
                    {name: 'isStore', type: 'bool'},
                    {name: 'isLinked', type: 'bool'},
                    {name: 'isXhImpl', type: 'bool'},
                    {name: 'hasLoadSupport', type: 'bool'},
                    {name: 'lastLoadCompleted', type: 'date'},
                    {name: 'lastLoadException', type: 'auto'}
                ]
            },
            sortBy: ['created|desc'],
            groupBy: this.showInGroups ? 'displayGroup' : null,
            selModel: {mode: 'multiple'},
            colChooserModel: true,
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
                            actionFn: ({record}) =>
                                (this.getInstance(record.id as string) as any)?.loadAsync(),
                            displayFn: ({record}) => ({hidden: !record.data.hasLoadSupport})
                        }
                    ]
                },
                {field: 'id', displayName: 'xhId'},
                {field: 'syncRun', displayName: 'Sync', autosizeIncludeHeaderIcons: false},
                {
                    field: 'isLinked',
                    headerName: Icon.link(),
                    headerTooltip: 'Linked model',
                    ...boolCheckCol,
                    width: 40,
                    tooltip: v => (v ? 'Linked model' : ''),
                    renderer: v => (v ? Icon.link() : null)
                },
                {field: 'displayGroup', hidden: true},
                {field: 'className', flex: 1, minWidth: 150},
                {
                    field: 'lastLoadCompleted',
                    displayName: 'Last Loaded',
                    align: 'right',
                    highlightOnChange: true,
                    hidden: true,
                    renderer: timestampRenderer
                },
                {field: 'created', align: 'right', renderer: timestampRenderer}
            ],
            rowClassFn: rec => {
                return rec?.data.isXhImpl ? 'xh-impl-row' : null;
            },
            onRowDoubleClicked: ({data: rec}) => this.logInstanceToConsole(rec),
            xhImpl: true
        });
    }

    private createPropertiesGridModel() {
        const iconCol: ColumnSpec = {width: 40, align: 'center', resizable: false};
        return new GridModel({
            persistWith: {...this.persistWith, path: 'propertiesGrid'},
            autosizeOptions: {mode: 'managed'},
            sortBy: 'displayProperty',
            groupBy: 'displayGroup',
            showGroupRowCounts: false,
            groupRowRenderer: ({value, node}) => propsGridGroupRenderer({value, node, model: this}),
            groupSortFn: (a, b) => {
                a = a === 'Watchlist' ? 0 : 1;
                b = b === 'Watchlist' ? 0 : 1;
                return a - b;
            },
            store: {
                fields: [
                    {name: 'instanceXhId', type: 'string'},
                    {name: 'instanceDisplayName', type: 'string'},
                    {name: 'property', type: 'string'},
                    {name: 'displayProperty', displayName: 'Property', type: 'string'},
                    {name: 'displayGroup', type: 'string'},
                    {name: 'valueType', type: 'string'},
                    {name: 'value', type: 'auto'},
                    {name: 'isWatchlistItem', type: 'bool'},
                    {name: 'isObservable', type: 'bool'},
                    {name: 'isHoistModel', type: 'bool'},
                    {name: 'isHoistService', type: 'bool'},
                    {name: 'isStore', type: 'bool'},
                    {name: 'isGetter', type: 'bool'},
                    {name: 'isLoadedGetter', type: 'bool'}
                ]
            },
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
                            icon: Icon.favorite(),
                            tooltip: 'Toggle Watchlist',
                            actionFn: ({record}) => this.togglePropsWatchlistItem(record),
                            displayFn: ({record}) => ({
                                icon: record.data.isWatchlistItem
                                    ? Icon.favorite({intent: 'warning', prefix: 'fas'})
                                    : Icon.favorite({className: 'xh-text-color-muted'})
                            })
                        }
                    ]
                },
                {
                    field: 'displayProperty',
                    width: 200,
                    renderer: (v, {record}) => {
                        return record.data.displayGroup === 'Watchlist'
                            ? a({
                                  item: v,
                                  onClick: () => this.selectInstanceAsync(record.data.instanceXhId)
                              })
                            : v;
                    }
                },
                {
                    field: 'isObservable',
                    headerName: Icon.eye(),
                    ...iconCol,
                    renderer: v => (v ? Icon.eye({title: 'Observable'}) : '')
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
                        if (data.isHoistModel || data.isHoistService || data.isStore) {
                            return a({item: v, onClick: () => this.selectInstanceAsync(v)});
                        }
                        return JSON.stringify(trimToDepth(v, 2));
                    }
                },
                {field: 'displayGroup', hidden: true}
            ],
            onRowDoubleClicked: ({data: rec}) => {
                if (!rec) return;
                if (rec.data.isGetter && !rec.data.isLoadedGetter) this.loadGetter(rec);
                this.logPropToConsole(rec);
            },
            xhImpl: true
        });
    }

    private autoLoadInstancesGrid() {
        this.addAutorun({
            run: () => {
                const {showXhImpl, instancesGridModel, selectedSyncRun} = this,
                    data = [];

                XH.inspectorService.activeInstances.forEach(inst => {
                    if (!showXhImpl && inst.isXhImpl) return;
                    if (selectedSyncRun && inst.syncRun !== selectedSyncRun) return;

                    const displayGroup = inst.isHoistService
                        ? 'Services'
                        : inst.isStore
                          ? 'Stores'
                          : 'Models';
                    data.push({...inst, displayGroup});
                });

                instancesGridModel.loadData(data);
            }
        });
    }

    private autoLoadPropertiesGrid() {
        this.addAutorun({
            run: () => {
                const {propertiesGridModel, selectedInstances, propsWatchlist} = this,
                    data = [];

                // Read properties (including getters) off of selected instances.
                selectedInstances.forEach(instance => {
                    const descriptors = this.getDescriptors(instance);

                    forIn(descriptors, (descriptor, property) => {
                        // Extract data from enumerable props and getters. Exclude prototype, as
                        // that renders as a confusing link to the superclass as if it were a
                        // distinct instance (which, you know, it kinda is but let's not go there).
                        if (property !== '__proto__' && (descriptor.enumerable || descriptor.get)) {
                            data.push(
                                this.getRecData({
                                    instance,
                                    property,
                                    isGetter: !!descriptor.get
                                })
                            );
                        }
                    });
                });

                // As well as any watchlist items.
                propsWatchlist.forEach(it => {
                    const wlInstance = this.getInstance(it.instanceXhId);
                    if (wlInstance) {
                        data.push(
                            this.getRecData({
                                instance: wlInstance,
                                property: it.property,
                                fromWatchlistItem: true,
                                isGetter: it.isGetter
                            })
                        );
                    }
                });

                propertiesGridModel.loadData(compact(data));
            },
            delay: 300
        });
    }

    private getDescriptors(instance) {
        let ret = Object.getOwnPropertyDescriptors(instance),
            proto = Object.getPrototypeOf(instance);

        if (proto) {
            ret = {...ret, ...this.getDescriptors(proto)};
        }

        return ret;
    }

    private getRecData({instance, property, fromWatchlistItem = false, isGetter = false}) {
        const {ownPropsOnly, observablePropsOnly, showUnderscoreProps} = this,
            isOwnProperty = Object.hasOwn(instance, property),
            isObservable = isObservableProp(instance, property);

        if (
            (ownPropsOnly && !isOwnProperty) ||
            (observablePropsOnly && !isObservable) ||
            (!showUnderscoreProps && property.startsWith('_'))
        )
            return null;

        const {xhId} = instance,
            ctorName = instance.constructor.name,
            instanceDisplayName = `${ctorName} [${xhId}]`,
            isLoadedGetter = isGetter && this.shouldLoadGetter(xhId, property),
            v = !isGetter || isLoadedGetter ? instance[property] : null,
            // Detect FormModel.values Proxy object - throws otherwise on attempt to render in grid.
            isProxy = !!v?._xhIsProxy,
            isHoistModel = v?.isHoistModel,
            isHoistService = v?.isHoistService,
            isStore = v?.isStore;

        const valueType =
            isGetter && !isLoadedGetter
                ? 'get(?)'
                : isProxy
                  ? 'Proxy'
                  : (v?.constructor?.name ?? typeof v);

        return {
            id: `${xhId}-${property}${fromWatchlistItem ? '-wl' : ''}`,
            instanceXhId: xhId,
            instanceDisplayName,
            property,
            // Watchlist items are shown under a single group - differentiate by prepending instDisplayName
            displayProperty: fromWatchlistItem ? `${instanceDisplayName}.${property}` : property,
            displayGroup: fromWatchlistItem ? 'Watchlist' : instanceDisplayName,
            value:
                isHoistModel || isHoistService || isStore
                    ? v.xhId
                    : isProxy
                      ? '[cannot render]'
                      : v,
            valueType,
            isOwnProperty,
            isObservable,
            isHoistModel,
            isHoistService,
            isStore,
            isGetter,
            isLoadedGetter,
            isWatchlistItem: !!this.getWatchlistItem(xhId, property)
        };
    }

    private shouldLoadGetter(instanceXhId, property) {
        return !!find(this.loadedGetters, {instanceXhId, property});
    }

    @action
    private loadGetter(rec) {
        const {instanceXhId, property} = rec.data;
        if (!this.shouldLoadGetter(instanceXhId, property)) {
            this.loadedGetters = [...this.loadedGetters, {instanceXhId, property}];
        }
    }

    @action
    loadAllCurrentGetters() {
        this.propertiesGridModel.store.records.forEach(rec => {
            const {isGetter, isLoadedGetter} = rec.data;
            if (isGetter && !isLoadedGetter) this.loadGetter(rec);
        });
    }

    private getWatchlistItem(instanceXhId, property) {
        return find(this.propsWatchlist, {instanceXhId, property});
    }
}

const timestampRenderer = v => fmtDate(v, {fmt: 'HH:mm:ss.SSS'});

const propsGridGroupRenderer = hoistCmp.factory<InstancesModel>(({value, node, model}) => {
    if (model.selectedInstances.length === 1 || value === 'Watchlist') return value;

    const firstRecData = node.allLeafChildren[0]?.data.data ?? {},
        {instanceXhId, instanceDisplayName} = firstRecData;
    return a({item: instanceDisplayName, onClick: () => model.selectInstanceAsync(instanceXhId)});
});
