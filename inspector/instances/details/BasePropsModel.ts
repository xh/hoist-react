/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColumnSpec, GridModel} from '@xh/hoist/cmp/grid';
import {a} from '@xh/hoist/cmp/layout';
import {HoistBase, hoistCmp, HoistModel, managed, PlainObject, XH} from '@xh/hoist/core';
import {Cube, StoreRecord, View} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, isObservableProp, makeObservable} from '@xh/hoist/mobx';
import {parseNameSource, trimToDepth} from '@xh/hoist/utils/js';
import {find} from 'lodash';
import type {InstancesModel} from '../InstancesModel';
import {instanceKey, starIcon} from '../watchlist/WatchlistUtils';

/**
 * Base for the Properties and Watchlist grids. Both list properties of live instances, with
 * on-demand getter evaluation, console logging, and a star to toggle Watchlist membership.
 *
 * @internal
 */
export abstract class BasePropsModel extends HoistModel {
    override xhImpl = true;

    parent: InstancesModel;
    @managed gridModel: GridModel;

    /** Getters evaluated on demand, as `{instanceXhId, property}`. */
    @bindable.ref loadedGetters: PlainObject[] = [];

    protected constructor(parent: InstancesModel, isWatchlist: boolean) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.gridModel = this.createGridModel(isWatchlist);
    }

    logPropToConsole(rec: StoreRecord) {
        if (!rec) return;

        const {instanceXhId, instanceDisplayName, property} = rec.data,
            instance = this.parent.getInstance(instanceXhId);

        if (!instance) {
            this.logWarn(`Instance ${instanceDisplayName} no longer alive - cannot be logged`);
        } else {
            const label = `${instanceDisplayName}.${property}`;
            console.log(label, instance[property]);
            XH.toast({icon: Icon.terminal(), message: `Logged ${label} to devtools console`});
        }
    }

    @action
    loadGetter(rec: StoreRecord) {
        const {instanceXhId, property} = rec.data;
        if (!this.isLoadedGetter(instanceXhId, property)) {
            this.loadedGetters = [...this.loadedGetters, {instanceXhId, property}];
        }
    }

    @action
    loadAllCurrentGetters() {
        this.gridModel.store.records.forEach(rec => {
            const {isGetter, isLoadedGetter} = rec.data;
            if (isGetter && !isLoadedGetter) this.loadGetter(rec);
        });
    }

    //------------------
    // Implementation
    //------------------
    /** Hook for subclasses to exclude properties from the grid. */
    protected shouldInclude(property: string, isOwnProperty: boolean, isObservable: boolean) {
        return true;
    }

    /** Hook for subclasses to evaluate getters beyond those loaded on demand. */
    protected shouldLoadGetter(instanceXhId: string, property: string): boolean {
        return this.isLoadedGetter(instanceXhId, property);
    }

    protected getRecData(instance: HoistBase, property: string, isGetter: boolean) {
        const isOwnProperty = Object.hasOwn(instance, property),
            isObservable = isObservableProp(instance, property);

        if (!this.shouldInclude(property, isOwnProperty, isObservable)) return null;

        const {xhId} = instance,
            key = instanceKey(instance.constructor.name, instance.xhName, xhId),
            instanceDisplayName = parseNameSource(instance),
            isLoadedGetter = isGetter && this.shouldLoadGetter(xhId, property),
            v = !isGetter || isLoadedGetter ? readProp(instance, property) : null,
            // Detect FormModel.values Proxy object - throws otherwise on attempt to render in grid.
            isProxy = !!v?._xhIsProxy,
            isHoistModel = v?.isHoistModel,
            isHoistService = v?.isHoistService,
            isStore = v?.isStore,
            isCube = Cube.isCube(v),
            isView = View.isView(v);

        const valueType =
            isGetter && !isLoadedGetter
                ? 'get(?)'
                : isProxy
                  ? 'Proxy'
                  : (v?.constructor?.name ?? typeof v);

        return {
            id: `${xhId}-${property}`,
            instanceXhId: xhId,
            instanceKey: key,
            instanceDisplayName,
            property,
            displayGroup: instanceDisplayName,
            value:
                isHoistModel || isHoistService || isStore || isCube || isView
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
            isCube,
            isView,
            isGetter,
            isLoadedGetter,
            isWatchlistItem: !!this.parent.watchlistModel.getProp(key, property)
        };
    }

    private isLoadedGetter(instanceXhId: string, property: string): boolean {
        return !!find(this.loadedGetters, {instanceXhId, property});
    }

    private createGridModel(isWatchlist: boolean) {
        const {parent} = this,
            iconCol: ColumnSpec = {width: 40, align: 'center', resizable: false};

        return new GridModel({
            persistWith: {
                ...parent.persistWith,
                path: isWatchlist ? 'watchlistGrid' : 'propertiesGrid',
                persistSort: false
            },
            autosizeOptions: {mode: 'managed'},
            filterModel: true,
            headerMenuDisplay: 'hover',
            colDefaults: {filterable: true},
            sortBy: 'property',
            groupBy: 'displayGroup',
            showGroupRowCounts: false,
            emptyText: isWatchlist ? 'Star a property to add it to the Watchlist.' : null,
            groupRowRenderer: ({value, node}) =>
                groupRenderer({value, node, isWatchlist, model: parent}),
            store: {
                fields: [
                    {name: 'instanceXhId', type: 'string'},
                    {name: 'instanceKey', type: 'string'},
                    {name: 'instanceDisplayName', type: 'string'},
                    {name: 'property', type: 'string'},
                    {name: 'displayGroup', type: 'string'},
                    {name: 'valueType', type: 'string'},
                    {name: 'value', type: 'auto'},
                    {name: 'isWatchlistItem', type: 'bool'},
                    {name: 'isObservable', type: 'bool'},
                    {name: 'isHoistModel', type: 'bool'},
                    {name: 'isHoistService', type: 'bool'},
                    {name: 'isStore', type: 'bool'},
                    {name: 'isCube', type: 'bool'},
                    {name: 'isView', type: 'bool'},
                    {name: 'isGetter', type: 'bool'},
                    {name: 'isLoadedGetter', type: 'bool'}
                ]
            },
            contextMenu: [
                {
                    text: 'Log to console',
                    icon: Icon.terminal(),
                    recordsRequired: 1,
                    actionFn: ({record}) => this.logPropToConsole(record)
                },
                {
                    text: 'Toggle Watchlist',
                    icon: Icon.favorite(),
                    recordsRequired: 1,
                    actionFn: ({record}) => parent.watchlistModel.toggleProp(record),
                    displayFn: ({record}) => ({
                        text: record?.data.isWatchlistItem
                            ? 'Remove from Watchlist'
                            : 'Add to Watchlist'
                    })
                },
                {
                    text: 'Load all getters',
                    icon: Icon.ellipsisHorizontal(),
                    actionFn: () => this.loadAllCurrentGetters(),
                    displayFn: () => ({
                        disabled: !this.gridModel.store.records.some(
                            ({data}) => data.isGetter && !data.isLoadedGetter
                        )
                    })
                },
                '-',
                ...GridModel.defaults.contextMenu
            ],
            columns: [
                {
                    ...actionCol,
                    colId: 'isWatchlistItem',
                    displayName: 'Watchlist',
                    headerName: Icon.favorite(),
                    headerTooltip: 'Watchlist',
                    width: calcActionColWidth(1),
                    actions: [
                        {
                            actionFn: ({record}) => parent.watchlistModel.toggleProp(record),
                            displayFn: ({record}) => {
                                const {isWatchlistItem} = record.data;
                                return {
                                    icon: starIcon(isWatchlistItem),
                                    tooltip: isWatchlistItem
                                        ? 'Remove from Watchlist'
                                        : 'Add to Watchlist'
                                };
                            }
                        }
                    ]
                },
                {field: 'property', width: 200},
                {
                    field: 'isObservable',
                    headerName: Icon.eye(),
                    ...iconCol,
                    hidden: isWatchlist,
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
                        if (
                            data.isHoistModel ||
                            data.isHoistService ||
                            data.isStore ||
                            data.isCube ||
                            data.isView
                        ) {
                            return a({item: v, onClick: () => parent.selectInstanceAsync(v)});
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
}

/** Read a property, surfacing a throwing getter as its error rather than breaking the grid. */
function readProp(instance: HoistBase, property: string) {
    try {
        return instance[property];
    } catch (e) {
        return `[throws: ${e?.message ?? e}]`;
    }
}

/** Group header - a link to select the instance, unless it is the single selected instance. */
const groupRenderer = hoistCmp.factory<InstancesModel>(({value, node, isWatchlist, model}) => {
    if (!isWatchlist && model.selectedInstances.length === 1) return value;

    const {instanceXhId, instanceDisplayName} = node.allLeafChildren[0]?.data.data ?? {};
    return a({item: instanceDisplayName, onClick: () => model.selectInstanceAsync(instanceXhId)});
});
