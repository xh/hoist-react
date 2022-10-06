import {boolCheckCol, GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {a} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, persist, XH} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {action, bindable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {trimToDepth} from '@xh/hoist/utils/js';
import {compact, find, forIn, head, without} from 'lodash';
import {isObservableProp, makeObservable} from 'mobx';

const {AUTO, BOOL, DATE, STRING} = FieldType;

/**
 * Displays a list of current HoistModel and HoistService instances, with the ability to view
 * properties (including reactive updates) for a selected instance.
 */
export class InstancesModel extends HoistModel {
    xhImpl = true;

    persistWith = {localStorageKey: `xhInspector.${XH.clientAppCode}.models`};

    /** @member {GridModel} */
    instancesGridModel;
    /** @member {GridModel} */
    propertiesGridModel;
    /** @member {PanelModel} */
    instancesPanelModel;

    @bindable @persist showInGroups = true;
    @bindable @persist showXhImpl = false;
    @bindable @persist showUnderscoreProps = false;
    @bindable @persist observablePropsOnly = false;
    @bindable @persist ownPropsOnly = true;

    @bindable.ref propsWatchlist = [];
    @bindable.ref loadedGetters = [];

    // Persisted storeFilterFields (convenient across frequent page refreshes when developing)
    @bindable @persist instancesStoreFilter;
    @bindable @persist propertiesStoreFilter;

    /** @return {HoistBase[]} */
    get selectedInstances() {
        return this.instancesGridModel.selectedIds.map(it => this.getInstance(it));
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
                track: () => this.instancesGridModel.store.records,
                run: () => this.instancesGridModel.preSelectFirstAsync()
            },
            {
                track: () => this.showInGroups,
                run: (showInGroups) => this.instancesGridModel.setGroupBy(showInGroups ? 'displayGroup' : null)
            },
            {
                track: () => [XH.inspectorService.activeInstances, this.showXhImpl],
                run: ([activeInstances, showXhImpl]) => {
                    const data = showXhImpl ? activeInstances : activeInstances.filter(it => !it.isXhImpl);
                    this.instancesGridModel.loadData(data);
                },
                fireImmediately: true
            }
        );

        this.autoLoadPropertiesGrid();
    }

    async selectInstanceAsync(xhId) {
        const inst = this.getInstance(xhId);

        if (inst.xhImpl && !this.showXhImpl) {
            this.setShowXhImpl(true);
            await wait();
        }

        const {instancesGridModel} = this,
            {store} = instancesGridModel,
            rec = store.getById(xhId);

        if (!rec) return;
        if (store.recordIsFiltered(rec)) store.clearFilter();
        await instancesGridModel.selectAsync(rec);
    }

    logInstanceToConsole(rec) {
        if (!rec) return;

        const xhId = rec.id,
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

    logPropToConsole(rec) {
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

    togglePropsWatchlistItem(record) {
        const {instanceXhId, property, isGetter} = record.data,
            {propsWatchlist} = this,
            currItem = this.getWatchlistItem(instanceXhId, property);

        this.propsWatchlist = currItem ?
            without(propsWatchlist, currItem) :
            [...propsWatchlist, {instanceXhId, property, isGetter}];
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
            emptyText: 'No matching instances found',
            store: {
                fields: [
                    {name: 'className', type: STRING},
                    {name: 'displayGroup', type: STRING},
                    {name: 'created', type: DATE},
                    {name: 'isLinked', type: BOOL},
                    {name: 'isXhImpl', type: BOOL},
                    {name: 'hasLoadSupport', type: BOOL},
                    {name: 'lastLoadCompleted', type: DATE},
                    {name: 'lastLoadException', type: AUTO}
                ]
            },
            sortBy: ['created'],
            groupBy: this.showInGroups ? 'displayGroup' : null,
            groupSortFn: (a, b) => {
                a = a === 'Services' ? '!' : a;
                b = b === 'Services' ? '!' : b;
                return this.instancesGridModel.defaultGroupSortFn(a, b);
            },
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
                            actionFn: ({record}) => this.getInstance(record.id)?.loadAsync(),
                            displayFn: ({record}) => ({hidden: !record.data.hasLoadSupport})
                        }
                    ]
                },
                {field: 'id', displayName: 'xhId'},
                {
                    field: 'isLinked',
                    headerName: Icon.link(),
                    headerTooltip: 'Linked model',
                    ...boolCheckCol,
                    width: 40,
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
                    hidden: true,
                    renderer: timestampRenderer
                },
                {field: 'created', align: 'right', renderer: timestampRenderer}
            ],
            rowClassFn: (rec) => {
                return rec?.data.isXhImpl ? 'xh-impl-row' : null;
            },
            onRowDoubleClicked: ({data: rec}) => this.logInstanceToConsole(rec),
            xhImpl: true
        });
    }

    createPropertiesGridModel() {
        const iconCol = {width: 40, align: 'center', resizable: false};
        return new GridModel({
            persistWith: {...this.persistWith, path: 'propertiesGrid'},
            autosizeOptions: {mode: GridAutosizeMode.MANAGED},
            emptyText: 'No matching properties found',
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
                    {name: 'instanceXhId', type: STRING},
                    {name: 'instanceDisplayName', type: STRING},
                    {name: 'property', type: STRING},
                    {name: 'displayProperty', displayName: 'Property', type: STRING},
                    {name: 'displayGroup', type: STRING},
                    {name: 'valueType', type: STRING},
                    {name: 'value', type: AUTO},
                    {name: 'isWatchlistItem', type: BOOL},
                    {name: 'isObservable', type: BOOL},
                    {name: 'isHoistModel', type: BOOL},
                    {name: 'isGetter', type: BOOL},
                    {name: 'isLoadedGetter', type: BOOL}
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
                    field: 'displayProperty',
                    width: 200,
                    renderer: (v, {record}) => {
                        return record.data.displayGroup === 'Watchlist' ?
                            a({item: v, onClick: () => this.selectInstanceAsync(record.data.xhId)}) :
                            v;
                    }
                },
                {
                    field: 'isObservable',
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
                        if (data.isHoistModel || data.isHoistService) {
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

    autoLoadPropertiesGrid() {
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
                            data.push(this.getRecData({
                                instance,
                                property,
                                isGetter: !!descriptor.get
                            }));
                        }
                    });
                });

                // As well as any watchlist items.
                propsWatchlist.forEach(it => {
                    const wlInstance = this.getInstance(it.instanceXhId);
                    if (wlInstance) {
                        data.push(this.getRecData({
                            instance: wlInstance,
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

    getDescriptors(instance) {
        let ret = Object.getOwnPropertyDescriptors(instance),
            proto = Object.getPrototypeOf(instance);

        if (proto) {
            ret = {...ret, ...this.getDescriptors(proto)};
        }

        return ret;
    }

    getRecData({instance, property, fromWatchlistItem = false, isGetter = false}) {
        const {ownPropsOnly, observablePropsOnly, showUnderscoreProps} = this,
            isOwnProperty = Object.hasOwn(instance, property),
            isObservable = isObservableProp(instance, property);

        if (
            (ownPropsOnly && !isOwnProperty) ||
            (observablePropsOnly && !isObservable) ||
            (!showUnderscoreProps && property.startsWith('_'))
        ) return null;

        const {xhId} = instance,
            ctorName = instance.constructor.name,
            instanceDisplayName = `${ctorName} [${xhId}]`,
            isLoadedGetter = isGetter && this.shouldLoadGetter(xhId, property),
            v = (!isGetter || isLoadedGetter) ? instance[property] : null,
            // Detect FormModel.values Proxy object - throws otherwise on attempt to render in grid.
            isProxy = !!v?._xhIsProxy,
            isHoistModel = v?.isHoistModel,
            isHoistService = v?.isHoistService;

        const valueType = (isGetter && !isLoadedGetter) ?
            'get(?)' :
            isProxy ? 'Proxy' : (v?.constructor?.name ?? typeof v);

        return {
            id: `${xhId}-${property}${fromWatchlistItem ? '-wl' : ''}`,
            instanceXhId: xhId,
            instanceDisplayName,
            property,
            // Watchlist items are shown under a single group - differentiate by prepending instDisplayName
            displayProperty: fromWatchlistItem ? `${instanceDisplayName}.${property}` : property,
            displayGroup: fromWatchlistItem ? 'Watchlist' : instanceDisplayName,
            value: (isHoistModel || isHoistService) ? v.xhId : isProxy ? '[cannot render]' : v,
            valueType,
            isOwnProperty,
            isObservable,
            isHoistModel,
            isHoistService,
            isGetter,
            isLoadedGetter,
            isWatchlistItem: !!this.getWatchlistItem(xhId, property)
        };
    }

    shouldLoadGetter(instanceXhId, property) {
        return !!find(this.loadedGetters, {instanceXhId, property});
    }

    loadGetter(rec) {
        const {instanceXhId, property} = rec.data;
        if (!this.shouldLoadGetter(instanceXhId, property)) {
            this.setLoadedGetters([...this.loadedGetters, {instanceXhId, property}]);
        }
    }

    @action
    loadAllCurrentGetters() {
        this.propertiesGridModel.store.records.forEach(rec => {
            const {isGetter, isLoadedGetter} = rec.data;
            if (isGetter && !isLoadedGetter) this.loadGetter(rec);
        });
    }

    getWatchlistItem(instanceXhId, property) {
        return find(this.propsWatchlist, {instanceXhId, property});
    }
}

const timestampRenderer = v => fmtDate(v, {fmt: 'HH:mm:ss.SSS'});

const propsGridGroupRenderer = hoistCmp.factory(({value, node, model}) => {
    if (model.selectedInstances.length === 1 || value === 'Watchlist') return value;

    const firstRecData = node.allLeafChildren[0]?.data.data ?? {},
        {instanceXhId, instanceDisplayName} = firstRecData;
    return a({item: instanceDisplayName, onClick: () => model.selectInstanceAsync(instanceXhId)});
});
