/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {boolCheckCol, GridModel} from '@xh/hoist/cmp/grid';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {HoistBase, HoistModel, managed, persist, XH} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {bindable, makeObservable, runInAction} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {compact, head} from 'lodash';
import {StatsModel} from '../stats/StatsModel';
import {DiagnosticsModel} from './details/DiagnosticsModel';
import {PropertiesModel} from './details/PropertiesModel';
import {allPanel} from './AllPanel';
import {WatchlistModel} from './watchlist/WatchlistModel';
import {watchlistPanel} from './watchlist/WatchlistPanel';
import {instanceKey, watchInstanceCol} from './watchlist/WatchlistUtils';

/**
 * Displays current HoistModel, HoistService, Store, Cube, and View instances - all of them, or a
 * starred Watchlist - with the ability to view properties (including reactive updates) and
 * diagnostics for the selected instances.
 */
export class InstancesModel extends HoistModel {
    override xhImpl = true;

    override persistWith = {localStorageKey: `xhInspector.${XH.clientAppCode}.instances`};

    /** Left-hand All / Watchlist tabs - the active tab's grid drives the detail tabs. */
    @managed navTabModel: TabContainerModel;
    instancesGridModel: GridModel;
    instancesPanelModel: PanelModel;
    @managed watchlistModel: WatchlistModel;
    @managed propertiesModel: PropertiesModel;
    @managed diagnosticsModel: DiagnosticsModel;

    get statsModel(): StatsModel {
        return XH.getModels(StatsModel)[0] as StatsModel;
    }

    get selectedSyncRun() {
        return this.statsModel?.selectedSyncRun;
    }

    // Persisted storeFilterField (convenient across frequent page refreshes when developing)
    @bindable @persist instancesStoreFilter;

    @bindable @persist instQuickFilters: string[] = ['showInGroups'];
    get showInGroups() {
        return this.instQuickFilters?.includes('showInGroups');
    }
    get showAnon() {
        return this.instQuickFilters?.includes('showAnon');
    }
    get showXhImpl() {
        return this.instQuickFilters?.includes('showXhImpl');
    }

    /** Grid of the active left-hand tab - source of the selection driving the detail tabs. */
    get activeGridModel(): GridModel {
        return this.navTabModel.activeTabId === 'watchlist'
            ? this.watchlistModel.instancesGridModel
            : this.instancesGridModel;
    }

    get selectedInstances(): HoistBase[] {
        return compact(this.activeGridModel.selectedIds.map((it: string) => this.getInstance(it)));
    }

    constructor() {
        super();
        makeObservable(this);

        this.navTabModel = new TabContainerModel({
            persistWith: {...this.persistWith, path: 'navTabs'},
            tabs: [
                {id: 'all', title: 'All', content: allPanel},
                {
                    id: 'watchlist',
                    title: 'Watchlist',
                    content: () => watchlistPanel({model: this.watchlistModel})
                }
            ],
            xhImpl: true
        });
        this.watchlistModel = new WatchlistModel(this);
        this.instancesGridModel = this.createInstancesGridModel();
        this.propertiesModel = new PropertiesModel(this);
        this.diagnosticsModel = new DiagnosticsModel(this);
        this.instancesPanelModel = new PanelModel({
            defaultSize: 575,
            side: 'left',
            collapsible: false,
            persistWith: {...this.persistWith, path: 'instancesPanel'}
        });

        this.addReaction(
            {
                track: () => this.showInGroups,
                run: showInGroups =>
                    this.instancesGridModel.setGroupBy(showInGroups ? 'displayGroup' : null)
            },
            {
                track: () => this.watchlistModel.count,
                run: count => {
                    const tab = this.navTabModel.tabs.find(it => it.id === 'watchlist');
                    tab.title = count ? `Watchlist (${count})` : 'Watchlist';
                },
                fireImmediately: true
            }
        );

        this.autoLoadInstancesGrid();
    }

    /**
     * Select an instance - in the Watchlist tab if active and it holds the instance, otherwise
     * in the All tab, widening its quick filters as needed to bring the instance into view.
     */
    async selectInstanceAsync(xhId: string) {
        const inst = this.getInstance(xhId);
        if (!inst) return;

        const {navTabModel, watchlistModel, instancesGridModel} = this,
            watchRec = watchlistModel.instancesGridModel.store.getById(xhId);

        if (navTabModel.activeTabId === 'watchlist' && watchRec) {
            await watchlistModel.instancesGridModel.selectAsync(watchRec);
            return;
        }

        const needed = compact([
            inst.xhImpl && !this.showXhImpl ? 'showXhImpl' : null,
            !inst.xhName && !this.showAnon ? 'showAnon' : null
        ]);
        if (needed.length || navTabModel.activeTabId !== 'all') {
            runInAction(() => {
                this.instQuickFilters = [...this.instQuickFilters, ...needed];
                navTabModel.setActiveTabId('all');
            });
            await wait();
        }

        const {store} = instancesGridModel,
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
            this.logWarn(`Instance with xhId ${xhId} no longer alive - cannot be logged`);
        } else {
            console.log(`[${rec.data.label}]`, instance);
            XH.toast({
                icon: Icon.terminal(),
                message: `Logged ${rec.data.label} to devtools console`
            });
        }
    }

    getInstance(xhId: string): HoistBase {
        if (!xhId) return null;
        return (
            head(XH.getModels(it => it.xhId === xhId)) ??
            XH.getServices().find(it => it.xhId === xhId) ??
            XH.getStores().find(it => it.xhId === xhId) ??
            XH.getCubes().find(it => it.xhId === xhId) ??
            XH.getViews().find(it => it.xhId === xhId)
        );
    }

    //------------------
    // Implementation
    //------------------
    private createInstancesGridModel() {
        return new GridModel({
            persistWith: {...this.persistWith, path: 'instancesGrid', persistGrouping: false},
            autosizeOptions: {mode: 'managed'},
            filterModel: true,
            headerMenuDisplay: 'hover',
            colDefaults: {filterable: true},
            emptyText: 'No matching (and alive) instances found.',
            store: {
                fields: [
                    {name: 'label', type: 'string'},
                    {name: 'className', type: 'string'},
                    {name: 'xhName', displayName: 'Name', type: 'string'},
                    {name: 'watchKey', type: 'string'},
                    {name: 'isWatched', type: 'bool'},
                    {name: 'alive', type: 'bool'},
                    {name: 'displayGroup', type: 'string'},
                    {name: 'created', type: 'date'},
                    {name: 'syncRun', type: 'number'},
                    {name: 'isHoistService', type: 'bool'},
                    {name: 'isHoistModel', type: 'bool'},
                    {name: 'isStore', type: 'bool'},
                    {name: 'isCube', type: 'bool'},
                    {name: 'isView', type: 'bool'},
                    {name: 'isLinked', type: 'bool'},
                    {name: 'isXhImpl', type: 'bool'},
                    {name: 'hasLoadSupport', type: 'bool'},
                    {name: 'lastLoadCompleted', type: 'date'},
                    {name: 'lastLoadException', type: 'auto'}
                ]
            },
            sortBy: 'label',
            groupBy: this.showInGroups ? 'displayGroup' : null,
            groupSortFn: (a, b) => GROUP_SORT_ORDER.indexOf(a) - GROUP_SORT_ORDER.indexOf(b),
            selModel: {mode: 'multiple'},
            colChooserModel: true,
            contextMenu: [
                {
                    text: 'Log to console',
                    icon: Icon.terminal(),
                    recordsRequired: 1,
                    actionFn: ({record}) => this.logInstanceToConsole(record)
                },
                {
                    text: 'Call loadAsync()',
                    icon: Icon.refresh({intent: 'success'}),
                    recordsRequired: 1,
                    actionFn: ({record}) =>
                        (this.getInstance(record.id as string) as any)?.loadAsync(),
                    displayFn: ({record}) => ({disabled: !record?.data.hasLoadSupport})
                },
                {
                    text: 'Toggle Watchlist',
                    icon: Icon.favorite(),
                    recordsRequired: 1,
                    actionFn: ({record}) => this.watchlistModel.toggleInstance(record),
                    displayFn: ({record}) => ({
                        text: record?.data.isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'
                    })
                },
                '-',
                ...GridModel.defaults.contextMenu
            ],
            columns: [
                watchInstanceCol(this.watchlistModel),
                {field: 'label', flex: 1, minWidth: 150},
                {field: 'id', displayName: 'ID', hidden: true},
                {field: 'displayGroup', hidden: true},
                {field: 'className', flex: 1, minWidth: 150, hidden: true},
                {field: 'xhName', flex: 1, minWidth: 150, hidden: true},
                {
                    field: 'syncRun',
                    displayName: 'Sync',
                    hidden: true,
                    headerTooltip:
                        'Sync run in which this instance first appeared. Inspector increments its sync run counter each time it detects newly-created instances, grouping instances that were created together.',
                    autosizeIncludeHeaderIcons: false
                },
                {
                    field: 'isLinked',
                    headerName: Icon.link(),
                    headerTooltip: 'Linked model',
                    ...boolCheckCol,
                    width: 40,
                    tooltip: v => (v ? 'Linked model' : ''),
                    renderer: v => (v ? Icon.link() : null),
                    hidden: true
                },
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
            rowClassFn: rec => (rec?.data.isXhImpl ? 'xh-impl-row' : null),
            onRowDoubleClicked: ({data: rec}) => this.logInstanceToConsole(rec),
            xhImpl: true
        });
    }

    private autoLoadInstancesGrid() {
        this.addAutorun(() => {
            const {showXhImpl, showAnon, watchlistModel, instancesGridModel, selectedSyncRun} =
                    this,
                data = [];

            XH.inspectorService.activeInstances.forEach(inst => {
                if (!showXhImpl && inst.isXhImpl) return;
                if (!showAnon && !inst.xhName) return;
                if (selectedSyncRun && inst.syncRun !== selectedSyncRun) return;

                const displayGroup = inst.isHoistService
                        ? 'Services'
                        : inst.isStore
                          ? 'Stores'
                          : inst.isCube
                            ? 'Cubes'
                            : inst.isView
                              ? 'Views'
                              : 'Models',
                    watchKey = instanceKey(inst.className, inst.xhName, inst.id);

                data.push({
                    ...inst,
                    displayGroup,
                    watchKey,
                    isWatched: watchlistModel.hasInstance(watchKey),
                    alive: true
                });
            });

            instancesGridModel.loadData(data);
        });
    }
}

const GROUP_SORT_ORDER = ['Models', 'Services', 'Cubes', 'Views', 'Stores'];

const timestampRenderer = v => fmtDate(v, {fmt: 'HH:mm:ss.SSS'});
