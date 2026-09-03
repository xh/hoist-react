/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {
    HoistBase,
    HoistModel,
    managed,
    PersistableState,
    PersistenceProvider,
    persistOptions,
    PlainObject,
    XH
} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable, computed, makeObservable, runInAction} from '@xh/hoist/mobx';
import {formatInstanceLabel} from '@xh/hoist/utils/js';
import {compact, find, without} from 'lodash';
import type {InstancesModel} from '../InstancesModel';
import {WatchlistPropsModel} from './WatchlistPropsModel';
import {instanceKey, isNamedKey, watchInstanceCol} from './WatchlistUtils';

/**
 * A basket of starred instances and properties to keep in view, independent of the current
 * selection. Entries for named instances persist across reloads; unnamed instances are keyed by
 * `xhId` and last for the page load only.
 *
 * @internal
 */
export class WatchlistModel extends HoistModel {
    override xhImpl = true;
    override persistWith = {localStorageKey: `xhInspector.${XH.clientAppCode}.instances`};

    parent: InstancesModel;
    @managed instancesGridModel: GridModel;
    @managed propsModel: WatchlistPropsModel;

    /** Watched instances, as keys from {@link instanceKey}. */
    @bindable.ref instanceKeys: string[] = [];

    /** Watched properties, as `{instanceKey, property, isGetter}`. */
    @bindable.ref props: PlainObject[] = [];

    @computed
    get count(): number {
        return this.instanceKeys.length + this.props.length;
    }

    constructor(parent: InstancesModel) {
        super();
        makeObservable(this);
        this.parent = parent;
        this.instancesGridModel = this.createInstancesGridModel();
        this.propsModel = new WatchlistPropsModel(parent);

        // Persist named entries only - xhId keys are meaningless after a reload.
        PersistenceProvider.create({
            persistOptions: persistOptions({path: 'watchlist'}, this.persistWith),
            owner: this,
            target: {
                getPersistableState: () =>
                    new PersistableState({
                        instanceKeys: this.instanceKeys.filter(isNamedKey),
                        props: this.props.filter(it => isNamedKey(it.instanceKey))
                    }),
                setPersistableState: ({value}) =>
                    runInAction(() => {
                        this.instanceKeys = value.instanceKeys ?? [];
                        this.props = value.props ?? [];
                    })
            }
        });

        this.addAutorun(() => this.loadInstancesGrid());
    }

    //------------------
    // Instances
    //------------------
    hasInstance(key: string): boolean {
        return this.instanceKeys.includes(key);
    }

    toggleInstance(record: StoreRecord) {
        const key = record?.data.watchKey;
        if (!key) return;
        const {instanceKeys} = this;
        this.instanceKeys = this.hasInstance(key)
            ? without(instanceKeys, key)
            : [...instanceKeys, key];
    }

    clearInstances() {
        this.instanceKeys = [];
    }

    /** Live instances matching a key - several when unnamed peers share an `xhName`. */
    resolveInstances(key: string): HoistBase[] {
        return compact(
            XH.inspectorService.activeInstances
                .filter(it => instanceKey(it.className, it.xhName, it.id) === key)
                .map(it => this.parent.getInstance(it.id))
        );
    }

    //------------------
    // Properties
    //------------------
    getProp(instanceKey: string, property: string): PlainObject {
        return find(this.props, {instanceKey, property});
    }

    toggleProp(record: StoreRecord) {
        const {instanceKey, property, isGetter} = record.data,
            {props} = this,
            curr = this.getProp(instanceKey, property);

        this.props = curr ? without(props, curr) : [...props, {instanceKey, property, isGetter}];
    }

    clearProps() {
        this.props = [];
    }

    //------------------
    // Implementation
    //------------------
    private loadInstancesGrid() {
        const {instanceKeys} = this,
            keySet = new Set(instanceKeys),
            data = [],
            matched = new Set<string>();

        XH.inspectorService.activeInstances.forEach(inst => {
            const watchKey = instanceKey(inst.className, inst.xhName, inst.id);
            if (!keySet.has(watchKey)) return;
            matched.add(watchKey);
            data.push({...inst, watchKey, isWatched: true, alive: true});
        });

        // Entries with no live instance - shown so they can be seen and un-starred.
        instanceKeys
            .filter(key => !matched.has(key))
            .forEach(key => {
                const sep = key.indexOf(':'),
                    className = sep > 0 ? key.slice(0, sep) : null,
                    xhName = sep > 0 ? key.slice(sep + 1) : null;
                data.push({
                    id: key,
                    watchKey: key,
                    label: className ? formatInstanceLabel(className, xhName, null) : key,
                    className,
                    xhName,
                    isWatched: true,
                    alive: false
                });
            });

        this.instancesGridModel.loadData(data);
    }

    private createInstancesGridModel() {
        const {parent} = this;
        return new GridModel({
            persistWith: {...this.persistWith, path: 'watchlistInstancesGrid'},
            autosizeOptions: {mode: 'managed'},
            headerMenuDisplay: 'hover',
            emptyText: 'Star an instance to add it to the Watchlist.',
            store: {
                fields: [
                    {name: 'label', type: 'string'},
                    {name: 'className', type: 'string'},
                    {name: 'xhName', displayName: 'Name', type: 'string'},
                    {name: 'watchKey', type: 'string'},
                    {name: 'isWatched', type: 'bool'},
                    {name: 'alive', type: 'bool'},
                    {name: 'created', type: 'date'},
                    {name: 'hasLoadSupport', type: 'bool'}
                ]
            },
            sortBy: 'label',
            selModel: {mode: 'multiple'},
            contextMenu: [
                {
                    text: 'Log to console',
                    icon: Icon.terminal(),
                    recordsRequired: 1,
                    actionFn: ({record}) => parent.logInstanceToConsole(record),
                    displayFn: ({record}) => ({disabled: !record?.data.alive})
                },
                {
                    text: 'Remove from Watchlist',
                    icon: Icon.favorite(),
                    recordsRequired: 1,
                    actionFn: ({record}) => this.toggleInstance(record)
                },
                '-',
                ...GridModel.defaults.contextMenu
            ],
            columns: [
                watchInstanceCol(this),
                {field: 'label', flex: 1, minWidth: 150},
                {
                    field: 'created',
                    align: 'right',
                    renderer: v => (v ? fmtDate(v, {fmt: 'HH:mm:ss.SSS'}) : null)
                }
            ],
            rowClassFn: rec => (rec?.data.alive ? null : 'xh-impl-row'),
            onRowDoubleClicked: ({data: rec}) =>
                rec?.data.alive && parent.logInstanceToConsole(rec),
            xhImpl: true
        });
    }
}
