/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {
    TabSwitcherConfig,
    IDynamicTabSwitcherModel,
    TabContainerModelPersistOptions
} from '@xh/hoist/cmp/tab/Types';
import {
    HoistModel,
    managed,
    PersistableState,
    PersistenceProvider,
    persistOptions,
    PlainObject,
    RefreshContextModel,
    RefreshMode,
    RenderMode,
    XH
} from '@xh/hoist/core';
import {DynamicTabSwitcherModel} from '@xh/hoist/desktop/cmp/tab/dynamic/DynamicTabSwitcherModel';
import {action, observable, observableRef} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {isOmitted} from '@xh/hoist/utils/impl';
import {ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {
    difference,
    find,
    findLast,
    flatMap,
    isEqual,
    isObject,
    isString,
    keys,
    pick,
    without
} from 'lodash';
import {ReactNode} from 'react';
import type {NavigationOptions} from 'router5';
import {TabConfig, TabModel} from './TabModel';

/**
 * Configuration for a {@link TabContainerModel} - the primary tabbed navigation container
 * in Hoist. Supports routing, lazy rendering/refresh strategies, and optional persistence
 * of the active tab.
 *
 * @see TabContainerModel
 * @see TabConfig
 */
export interface TabContainerConfig {
    /** Tabs to be displayed. */
    tabs: TabConfig[];

    /**
     * ID of Tab to be shown initially if routing does not specify otherwise. If not set,
     * will default to first tab in the provided collection.
     */
    defaultTabId?: string;

    /**
     * Base route name for this container. If set, this container will be route-enabled, with the
     * route for each tab being "[route]/[tab.id]".
     */
    route?: string;

    /**
     * True (default) to restore a tab's last route - including any descendant route and the params
     * owned by the tab - when navigating back to it via this container. Skipped if a shared path
     * param has changed since. False to return to the tab's bare route instead. Applies only when
     * `route` is set. Note this restores descendant routes owned by any nested container too.
     */
    restoreTabRouteParams?: boolean;

    /**
     * Specification for type of switcher. Specify `dynamic` or config for user-configurable tabs.
     * Default `{mode: 'static'}` for simple, static switcher.
     */
    switcher?: TabSwitcherConfig;

    /**
     * True to enable activity tracking of tab views (default false).  Viewing of each tab will
     * be tracked with the `oncePerSession` flag, to avoid duplication.
     */
    track?: boolean;

    /**
     * Strategy for rendering child tabs. Can be set per-tab via `TabModel.renderMode`. See enum
     * for description of supported modes.
     */
    renderMode?: RenderMode;

    /**
     * Strategy for refreshing child tabs. Can be set per-tab via `TabModel.refreshMode`.
     * See enum for description of supported modes.
     */
    refreshMode?: RefreshMode;

    /**
     * Options governing persistence. Tab containers can persist their last-active tab as well
     * as favorite tabs for the dynamic `switcher` option. Note that this must be left unset or
     * its nested `persistActiveTabId` option must be set to false if also using `route`, to avoid
     * a possible conflict between an initial route and persisted last active tab.
     */
    persistWith?: TabContainerModelPersistOptions;

    /**
     * Placeholder to display if no tabs are provided or all tabs have been removed via
     * their `omit` config.
     */
    emptyText?: ReactNode;

    /** @internal */
    xhImpl?: boolean;

    /** See {@link HoistBase.xhName}. */
    xhName?: string;
}

/**
 * Model for a TabContainer, representing its layout/contents and the currently displayed Tab.
 *
 * This object provides support for routing based navigation, customizable (lazy) mounting and
 * unmounting of inactive tabs, and customizable refreshing of tabs via a built-in RefreshContextModel.
 *
 * Note: Routing is currently enabled for desktop applications only.
 *
 * See the tab package README (`cmp/tab/README.md`) for render/refresh mode options, routing
 * configuration, and usage patterns.
 *
 * @mcpHint model for tabbed container with routing and refresh support
 */
export class TabContainerModel extends HoistModel {
    declare config: TabContainerConfig;

    @managed
    @observableRef
    accessor tabs: TabModel[] = null;

    @observable accessor activeTabId: string;

    depth: number; // Depth in hierarchy of nested TabContainerModels
    route: string;
    restoreTabRouteParams: boolean;
    defaultTabId: string;
    track: boolean;
    renderMode: RenderMode;
    refreshMode: RefreshMode;
    emptyText: ReactNode;
    switcherConfig: TabSwitcherConfig;

    @managed
    refreshContextModel: RefreshContextModel;

    @managed
    dynamicTabSwitcherModel: IDynamicTabSwitcherModel;

    protected lastActiveTabId: string;

    /** Last-seen route state within each tab, by tab ID - see `restoreTabRouteParams`. */
    protected tabRouteMemory: Record<string, TabRouteMemory> = {};

    /**
     * @param config - TabContainer configuration.
     * @param depth - Depth in hierarchy of nested TabContainerModels. Not for application use.
     */
    constructor(
        {
            tabs = [],
            defaultTabId = null,
            route = null,
            restoreTabRouteParams = true,
            track = false,
            renderMode = 'lazy',
            refreshMode = 'onShowLazy',
            persistWith,
            emptyText = 'No tabs to display.',
            xhName = null,
            xhImpl = false,
            switcher = {mode: 'static'}
        }: TabContainerConfig,
        depth: number = 0
    ) {
        super();
        this.xhImpl = xhImpl;
        this.xhName = xhName;

        this.depth = depth;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.defaultTabId = defaultTabId;
        this.emptyText = emptyText;
        this.route = route;
        this.restoreTabRouteParams = restoreTabRouteParams;
        this.track = track;
        this.setTabs(tabs);
        this.refreshContextModel = new RefreshContextModel();
        this.refreshContextModel.xhImpl = xhImpl;
        this.refreshContextModel.xhName = this.childXhName('refreshContextModel');
        this.switcherConfig = switcher;
        this.dynamicTabSwitcherModel = this.parseSwitcher(switcher);

        if (route) {
            if (XH.isMobileApp) {
                this.logWarn('TabContainer routing is not supported for mobile applications.');
                return;
            }

            this.addReaction({
                track: () => XH.routerState,
                run: this.syncWithRouter
            });
            wait().then(() => this.syncWithRouter());

            this.forwardRouterToTab(this.activeTabId);
        }

        if (persistWith) this.initPersist(persistWith);

        if (track) {
            this.addReaction({
                track: () => this.activeTab,
                run: activeTab => {
                    const {route} = this,
                        {title, id} = activeTab;
                    XH.track({
                        category: 'Navigation',
                        message: `Viewed ${isString(title) ? title : id} tab`,
                        // If using routing, data field specifies route for non-top-level tabs.
                        data: route && route !== 'default' ? {route: route} : null,
                        oncePerSession: true
                    });
                }
            });
        }
    }

    /** Set/replace all tabs within the container. */
    @action
    setTabs(tabs: Array<TabModel | TabConfig>) {
        const oldTabs = this.tabs,
            isInit = oldTabs === null;
        throwIf(!isInit && this.route, 'Dynamic tabs not available on TabContainer with routing.');
        throwIf(!isInit && XH.isMobileApp, 'Dynamic tabs not available on mobile TabContainer.');

        ensureUniqueBy(tabs, 'id', 'Multiple tabs have the same id.');

        tabs = tabs.filter(p => p instanceof TabModel || !isOmitted(p));

        // Adjust state -- intentionally setting activeTab *before* instantiating new tabs.
        const {activeTabId} = this;
        if (!activeTabId || !tabs.find(t => t.id === activeTabId && !t.disabled)) {
            this.activeTabId = this.calculateActiveTabId(tabs);
        }
        this.tabs = tabs.map(t =>
            t instanceof TabModel ? t : new TabModel({...t, xhImpl: this.xhImpl}, this)
        );

        if (oldTabs) {
            XH.safeDestroy(difference(oldTabs, this.tabs));
        }
    }

    /** Add a single tab to the container. */
    @action
    addTab(tab: TabModel | TabConfig, opts?: AddTabOptions): TabModel {
        const {tabs} = this,
            {index = tabs.length, activateImmediately = false} = opts ?? {};
        this.setTabs([...tabs.slice(0, index), tab, ...tabs.slice(index)]);
        if (activateImmediately) {
            this.setActiveTabId(tab.id);
        }
        return this.findTab(tab.id);
    }

    /**
     * Remove a single tab from the container.
     * Supported for tabs that are immediate children of this container.
     */
    @action
    removeTab(tab: TabModel | string) {
        const {tabs, activeTab} = this,
            toRemove = find(tabs, t => t === tab || t.id === tab);

        if (!toRemove) return;

        // Activate alternative tab if we are about to remove active
        if (toRemove === activeTab) {
            let toActivate = this.findTab(this.lastActiveTabId);
            if (!toActivate || toActivate === toRemove) {
                toActivate = this.nextTab ?? this.prevTab;
            }
            if (toActivate) {
                this.setActiveTabId(toActivate.id);
            }
        }

        this.setTabs(without(tabs, toRemove));
    }

    /**
     * Update the title of an existing tab.
     * Supported for tabs that are immediate children of this container.
     * Logs failures quietly on debug if not found.
     * */
    setTabTitle(tabId: string, title: ReactNode) {
        const tab = this.findTab(tabId);
        if (tab) {
            tab.title = title;
        }
    }

    /** Find a tab that is an immediate child of this container. */
    findTab(id: string): TabModel {
        return find(this.tabs, {id});
    }

    get activeTab(): TabModel {
        return this.findTab(this.activeTabId);
    }

    /** The visitable tab immediately before the active tab in the model's tab list. */
    get prevTab(): TabModel {
        const tabs = this.tabs.filter(t => !t.disabled || t === this.activeTab),
            activeTabIdx = tabs.indexOf(this.activeTab);
        return activeTabIdx > 0 ? tabs[activeTabIdx - 1] : null;
    }

    /** The visitable tab immediately after the active tab in the model's tab list. */
    get nextTab(): TabModel {
        const tabs = this.tabs.filter(t => !t.disabled || t === this.activeTab),
            activeTabIdx = tabs.indexOf(this.activeTab);
        return activeTabIdx < tabs.length - 1 ? tabs[activeTabIdx + 1] : null;
    }

    /**
     * Set the currently active Tab by ID.
     *
     * This method may be bound directly to a UI control (e.g., a SegmentedControl). It handles
     * routing-aware navigation: if this container is route-enabled, the tab will only be updated
     * once the router state changes. Otherwise, the active Tab will be updated immediately.
     *
     * @param id - ID of TabModel to be activated.
     */
    setActiveTabId(id: string) {
        const tab = this.findTab(id);
        if (!tab || tab.disabled || tab.isActive) return;

        if (this.route) {
            this.navigateToTab(tab.id);
        } else {
            this.setActiveTabIdInternal(tab.id);
        }
    }

    /**
     * Set the currently active Tab. Convenience for {@link setActiveTabId} that also accepts a
     * TabModel instance directly.
     *
     * @param tab - TabModel or id of TabModel to be activated.
     */
    activateTab(tab: TabModel | string) {
        this.setActiveTabId(tab instanceof TabModel ? tab.id : tab);
    }

    /**
     * Navigate to the first enabled tab before the currently active tab, if any.
     * @param cycle - true to loop back to last tab if necessary.
     */
    activatePrevTab(cycle: boolean = false) {
        const {tabs} = this,
            idx = tabs.indexOf(this.activeTab);
        let target = findLast(tabs, f => !f.disabled, idx - 1);
        if (cycle && !target) target = findLast(tabs, f => !f.disabled);
        if (target) this.setActiveTabId(target.id);
    }

    /**
     * Navigate to the next enabled tab after the currently active tab, if any.
     * @param cycle - true to loop back to first tab if necessary.
     */
    activateNextTab(cycle: boolean = false) {
        const {tabs} = this,
            idx = tabs.indexOf(this.activeTab);
        let target = find(tabs, f => !f.disabled, idx + 1);
        if (cycle && !target) target = find(tabs, f => !f.disabled);
        if (target) this.setActiveTabId(target.id);
    }

    //-------------------------
    // Implementation
    //-------------------------
    @action
    protected setActiveTabIdInternal(id) {
        const tab = this.findTab(id);
        throwIf(!tab, `Unknown Tab ${id} in TabContainer.`);
        throwIf(tab.disabled, `Cannot activate Tab ${id} because it is disabled!`);
        this.lastActiveTabId = this.activeTabId;
        this.activeTabId = id;
        this.forwardRouterToTab(id);
    }

    /**
     * Sync this container with the current route, on every router change. Activates the tab
     * matching the route and records its route for restore, or - if the route stops at this
     * container's own route - completes it to the active tab.
     */
    protected syncWithRouter() {
        const {tabs, route, activeTabId} = this;
        if (!this.isRouteActive(route)) return;

        const tab = tabs.find(t => this.isRouteActive(route + '.' + t.id));
        if (tab) {
            if (this.restoreTabRouteParams) this.recordTabRoute(tab.id);
            if (!tab.isActive && !tab.disabled) {
                this.setActiveTabIdInternal(tab.id);
            }
        } else if (activeTabId) {
            // Our own route is active without a tab - e.g. a deep link to this container, or a
            // multi-level forward, which router5 resolves only one level deep. Complete the
            // route to the active tab, so the URL reflects what is shown. Skipped for a guard
            // redirect, which may have deliberately sent us here.
            const {name, meta} = XH.router.getState();
            if (name === route && !meta?.options?.redirected) {
                this.navigateToTab(activeTabId, {replace: true});
            }
        }
    }

    /**
     * Navigate to a tab - restoring its last-seen route (including any descendant route) and
     * params if enabled and still valid, else to its bare route. Shared params are always kept.
     */
    protected navigateToTab(id: string, opts?: NavigationOptions) {
        const tabRoute = this.route + '.' + id,
            shared = this.getSharedRouteParams(),
            memory = this.restoreTabRouteParams ? this.tabRouteMemory[id] : null,
            restore = memory && isEqual(memory.sharedUrlParams, this.getSharedRouteParams(true));

        if (restore && this.tryNavigate(memory.name, {...memory.params, ...shared}, opts)) return;
        this.tryNavigate(tabRoute, shared, opts);
    }

    private tryNavigate(name: string, params: PlainObject, opts: NavigationOptions): boolean {
        try {
            XH.navigate(name, params, opts);
            return true;
        } catch (e) {
            this.logWarn(`Failed to navigate to route '${name}'`, e);
            return false;
        }
    }

    /** Record the current route within a tab, for restore by {@link navigateToTab}. */
    protected recordTabRoute(tabId: string) {
        this.tabRouteMemory[tabId] = {
            name: XH.router.getState().name,
            params: this.getTabRouteParams(tabId),
            sharedUrlParams: this.getSharedRouteParams(true)
        };
    }

    /**
     * Is the named route active, either exactly or as an ancestor of the current route? Passes the
     * current params, as router5 otherwise fails an exact match on any route with a URL param.
     */
    protected isRouteActive(name: string): boolean {
        const {router} = XH,
            state = router.getState();
        return !!state && router.isActive(name, state.params);
    }

    /**
     * Current route params to carry over when navigating to a new tab - only those declared by
     * this container's route or its ancestors. Params declared by the outgoing tab's own route (or
     * its descendants) belong to that tab and are dropped, so they don't bleed into its siblings.
     *
     * @param urlOnly - true to return only path (URL) params, excluding query params.
     */
    protected getSharedRouteParams(urlOnly: boolean = false): PlainObject {
        const {route} = this;
        return this.pickDeclaredRouteParams(
            name => name === route || route.startsWith(name + '.'),
            urlOnly
        );
    }

    /**
     * Current route params owned by a tab - those declared by its route or its descendants.
     * Recorded as the tab's route changes, for restore when navigating back to it.
     */
    protected getTabRouteParams(tabId: string): PlainObject {
        const tabRoute = this.route + '.' + tabId;
        return this.pickDeclaredRouteParams(
            name => name === tabRoute || name.startsWith(tabRoute + '.')
        );
    }

    /** Current route params declared by any active route whose name passes `test`. */
    private pickDeclaredRouteParams(
        test: (routeName: string) => boolean,
        urlOnly: boolean = false
    ): PlainObject {
        const state = XH.router.getState();
        if (!state) return {};

        const names = flatMap(state.meta?.params ?? {}, (params, routeName) =>
            test(routeName) ? keys(params).filter(p => !urlOnly || params[p] === 'url') : []
        );
        return pick(state.params, names);
    }

    protected forwardRouterToTab(id) {
        const {route} = this;
        if (route && id) {
            XH.router.forward(route, route + '.' + id);
        }
    }

    protected calculateActiveTabId(tabs) {
        let ret;

        // try route
        const {route} = this;
        if (route && this.isRouteActive(route)) {
            ret = tabs.find(t => this.isRouteActive(route + '.' + t.id));
            if (ret && !ret.disabled) return ret.id;
        }

        // or default
        ret = tabs.find(t => t.id === this.defaultTabId);
        if (ret && !ret.disabled) return ret.id;

        // or first enabled tab
        ret = tabs.find(t => !t.disabled);
        if (ret) return ret.id;

        return null;
    }

    private parseSwitcher(switcher: TabContainerConfig['switcher']): IDynamicTabSwitcherModel {
        if (!switcher || switcher.mode === 'static') return null;
        throwIf(XH.isMobileApp, 'DynamicTabSwitcherModel not supported for mobile TabContainer.');

        const ret = this.markManaged(new DynamicTabSwitcherModel(switcher, this));
        ret.xhName = this.childXhName('dynamicTabSwitcherModel');
        return ret;
    }

    private initPersist({
        persistActiveTabId = !this.route,
        persistFavoriteTabIds = !!this.dynamicTabSwitcherModel,
        path = 'tabContainer',
        ...rootPersistWith
    }: TabContainerModelPersistOptions) {
        if (persistActiveTabId) {
            if (this.route) {
                this.logWarn('persistActiveTabId and route cannot both be specified.');
            } else {
                PersistenceProvider.create({
                    persistOptions: persistOptions(
                        {path: `${path}.activeTabId`},
                        rootPersistWith,
                        isObject(persistActiveTabId) ? persistActiveTabId : null
                    ),
                    target: {
                        getPersistableState: () => new PersistableState(this.activeTabId),
                        setPersistableState: ({value}) => this.setActiveTabId(value)
                    },
                    owner: this
                });
            }
        }

        if (persistFavoriteTabIds) {
            const {dynamicTabSwitcherModel} = this;
            if (!dynamicTabSwitcherModel) {
                this.logWarn(
                    'persistFavoriteTabIds is set but no DynamicTabSwitcherModel is present.'
                );
            } else {
                PersistenceProvider.create({
                    persistOptions: persistOptions(
                        {path: `${path}.favoriteTabIds`},
                        rootPersistWith,
                        isObject(persistFavoriteTabIds) ? persistFavoriteTabIds : null
                    ),
                    target: {
                        getPersistableState: () =>
                            new PersistableState(dynamicTabSwitcherModel.favoriteTabIds),
                        setPersistableState: ({value}) => {
                            dynamicTabSwitcherModel.setFavoriteTabIds(value);
                        }
                    },
                    owner: this
                });
            }
        }
    }
}

export interface AddTabOptions {
    /** Index in tab collection where tab is to be added. */
    index?: number;
    /** True to immediately activate new tab. */
    activateImmediately?: boolean;
}

/** A tab's last-seen route, as recorded by {@link TabContainerModel} for restore. */
interface TabRouteMemory {
    /** Full name of the active route within the tab - the tab route or a descendant. */
    name: string;
    /** Params owned by the tab - declared by its route or its descendants. */
    params: PlainObject;
    /** Shared path params at time of recording - memory is restored only while these match. */
    sharedUrlParams: PlainObject;
}
