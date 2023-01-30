/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    managed,
    RefreshContextModel,
    PersistenceProvider,
    RefreshMode,
    RenderMode,
    XH,
    PersistOptions
} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {isOmitted} from '@xh/hoist/utils/impl';
import {find, isString, isUndefined, without, difference} from 'lodash';
import {ReactNode} from 'react';
import {TabConfig, TabModel} from './TabModel';
import {TabSwitcherProps} from './TabSwitcherProps';

export interface TabContainerConfig {

    /** Tabs to be displayed. */
    tabs?: TabConfig[];

    /**
     * ID of Tab to be shown initially if routing does not specify otherwise. If not set,
     * will default to first tab in the provided collection.
     */
    defaultTabId?: string;

    /**
     * Base route name for this container. If set, this container will be route-enabled, with the
     * route for each tab being "[route]/[tab.id]".  Cannot be used with `persistWith`.
     */
    route?: string;

    /**
     * Indicates whether to include a default switcher docked within this component. Specify as a
     * boolean or an object containing props for a TabSwitcher component. Set to false to not
     * include a switcher. Defaults to true.
     */
    switcher?: boolean|TabSwitcherProps;

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

    /** Options governing persistence. Cannot be used with `route`. */
    persistWith?: PersistOptions;

    /**
     * Placeholder to display if no tabs are provided or all tabs have been removed via
     * their `omit` config.
     */
    emptyText?: ReactNode;

    /** @internal */
    xhImpl?: boolean;
}


/**
 * Model for a TabContainer, representing its layout/contents and the currently displayed Tab.
 *
 * This object provides support for routing based navigation, customizable (lazy) mounting and
 * unmounting of inactive tabs, and customizable refreshing of tabs via a built-in RefreshContextModel.
 *
 * Note: Routing is currently enabled for desktop applications only.
 */
export class TabContainerModel extends HoistModel {
    declare config: TabContainerConfig;

    @managed
    @observable.ref
    tabs: TabModel[] = null;

    @observable
    activeTabId: string;

    route: string;
    defaultTabId: string;
    switcher: TabSwitcherProps;
    track: boolean;
    renderMode: RenderMode;
    refreshMode: RefreshMode;
    emptyText: ReactNode;
    provider: PersistenceProvider;

    @managed
    refreshContextModel: RefreshContextModel;

    private lastActiveTabId: string;

    constructor({
        tabs = [],
        defaultTabId = null,
        route = null,
        switcher = true,
        track = false,
        renderMode = 'lazy',
        refreshMode = 'onShowLazy',
        persistWith,
        emptyText = 'No tabs to display.',
        xhImpl = false
    }: TabContainerConfig) {
        super();
        makeObservable(this);
        this.xhImpl = xhImpl;

        throwIf(route && persistWith, '"persistWith" and "route" cannot both be specified.');

        // Create default switcher props
        if (switcher === true) switcher = {orientation: XH.isMobileApp ? 'bottom' : 'top'};
        if (switcher === false) switcher = null;

        this.switcher = switcher as TabSwitcherProps;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.defaultTabId = defaultTabId;
        this.emptyText = emptyText;
        this.route = route;
        this.track = track;
        this.setTabs(tabs);
        this.refreshContextModel = new RefreshContextModel();
        this.refreshContextModel.xhImpl = xhImpl;

        if (route) {
            if (XH.isMobileApp) {
                console.warn('Tab container routing is not supported for mobile applications.');
                return;
            }

            this.addReaction({
                track: () => XH.routerState,
                run: this.syncWithRouter
            });

            this.forwardRouterToTab(this.activeTabId);
        } else if (persistWith) {
            this.setupStateProvider(persistWith);
        }

        if (track) {
            this.addReaction({
                track: () => this.activeTab,
                run: (activeTab) => {
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

    //-----------------------------
    // Manage contents.
    //-----------------------------
    /**
     * Set the Tabs displayed by this object.
     */
    @action
    setTabs(tabs: Array<TabModel|TabConfig>) {
        const oldTabs = this.tabs,
            isInit = (oldTabs === null);
        throwIf(!isInit && this.route, 'Dynamic tabs not available on TabContainer with routing.');
        throwIf(!isInit && XH.isMobileApp, 'Dynamic tabs not available on mobile TabContainer.');

        ensureUniqueBy(tabs, 'id', 'Multiple tabs have the same id.');

        tabs = tabs
            .filter(p =>  p instanceof TabModel || !isOmitted(p));

        // Adjust state -- intentionally setting activeTab *before* instantiating new tabs.
        const {activeTabId} = this;
        if (!activeTabId || !tabs.find(t => t.id === activeTabId && !t.disabled)) {
            this.activeTabId = this.calculateActiveTabId(tabs);
        }
        this.tabs = tabs.map(t => t instanceof TabModel? t : new TabModel({
            ...t,
            containerModel: this,
            xhImpl: this.xhImpl
        }));

        if (oldTabs) {
            XH.safeDestroy(difference(oldTabs, this.tabs));
        }
    }

    /** Add a Tab for display.*/
    @action
    addTab(tab: TabModel|TabConfig, opts?: AddTabOptions): TabModel {
        const {tabs} = this,
            {index = tabs.length, activateImmediately = false} = opts ?? {};
        this.setTabs([...tabs.slice(0, index), tab, ...tabs.slice(index)]);
        if (activateImmediately) {
            this.activateTab(tab.id);
        }
        return this.findTab(tab.id);
    }

    /**
     * Remove a Tab for display.
     * @param tab - TabModel or id of TabModel to be removed.
     */
    @action
    removeTab(tab: TabModel|string) {
        const {tabs, activeTab} = this,
            toRemove = find(tabs, (t) => t === tab || t.id === tab);

        if (!toRemove) return;

        // Activate alternative tab if we are about to remove active
        if (toRemove === activeTab) {
            let toActivate = this.findTab(this.lastActiveTabId);
            if (!toActivate || toActivate === toRemove) {
                toActivate = this.nextTab ?? this.prevTab;
            }
            if (toActivate) {
                this.activateTab(toActivate);
            }
        }

        this.setTabs(without(tabs, toRemove));
    }

    //-------------------------------
    // Access Tabs, active management
    //-------------------------------
    findTab(id: string): TabModel {
        return find(this.tabs, {id});
    }

    get activeTab(): TabModel {
        return this.findTab(this.activeTabId);
    }

    /** The tab immediately before the active tab in the model's tab list. */
    get prevTab(): TabModel {
        const activeTabIdx = this.tabs.indexOf(this.activeTab);
        return activeTabIdx > 0 ? this.tabs[activeTabIdx - 1] : null;
    }

    /** The tab immediately after the active tab in the model's tab list. */
    get nextTab(): TabModel {
        const activeTabIdx = this.tabs.indexOf(this.activeTab);
        return activeTabIdx < this.tabs.length - 1 ? this.tabs[activeTabIdx + 1] : null;
    }

    /**
     * Set the currently active Tab.
     *
     * If using routing, this method will navigate to the new tab via the router and the active Tab
     * will only be updated once the router state changes. Otherwise the active Tab will be updated
     * immediately.
     *
     * @param tab - TabModel or id of TabModel to be activated.
     */
    activateTab(tab: TabModel|string) {
        tab = this.findTab(tab instanceof TabModel ? tab.id : tab);

        if (!tab || tab.disabled || tab.isActive) return;

        const {route} = this;
        if (route) {
            XH.navigate(route + '.' + tab.id);
        } else {
            this.setActiveTabIdInternal(tab.id);
        }
    }

    /** Navigate to the tab immediately before the currently active tab, if any. */
    activatePrevTab() {
        const {prevTab} = this;
        if (prevTab) this.activateTab(prevTab.id);
    }

    /** Navigate to the tab immediately after the currently active tab, if any. */
    activateNextTab() {
        const {nextTab} = this;
        if (nextTab) this.activateTab(nextTab.id);
    }

    //-------------------------
    // Implementation
    //-------------------------
    @action
    private setActiveTabIdInternal(id) {
        const tab = this.findTab(id);
        throwIf(!tab, `Unknown Tab ${id} in TabContainer.`);
        throwIf(tab.disabled, `Cannot activate Tab ${id} because it is disabled!`);
        this.lastActiveTabId = this.activeTabId;
        this.activeTabId = id;
        this.forwardRouterToTab(id);
    }

    private syncWithRouter() {
        const {tabs, route} = this,
            {router} = XH;

        if (router.isActive(route)) {
            const tab = tabs.find(t => router.isActive(route + '.' + t.id));
            if (tab && !tab.isActive && !tab.disabled) {
                this.setActiveTabIdInternal(tab.id);
            }
        }
    }

    private forwardRouterToTab(id) {
        const {route} = this;
        if (route && id) {
            XH.router.forward(route, route + '.' + id);
        }
    }

    private calculateActiveTabId(tabs) {
        let ret;

        // try route
        const {route} = this,
            {router} = XH;
        if (route && router.isActive(route)) {
            ret = tabs.find(t => router.isActive(route + '.' + t.id));
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

    private setupStateProvider(persistWith) {
        // Read state from provider -- fail gently
        let state = null;

        try {
            this.provider = PersistenceProvider.create({path: 'tabContainer', ...persistWith});
            state = this.provider.read() || null;
        } catch (e) {
            console.error(e);
            XH.safeDestroy(this.provider);
            this.provider = null;
        }

        // Initialize state, or clear if state's activeTabId no longer exists
        if (!isUndefined(state?.activeTabId)) {
            const id = state.activeTabId;
            if (this.findTab(id)) {
                this.activateTab(id);
            } else {
                this.provider.clear();
            }
        }

        // Attach to provider last
        if (this.provider) {
            this.addReaction({
                track: () => this.activeTabId,
                run: (activeTabId) => this.provider.write({activeTabId})
            });
        }
    }
}


export interface AddTabOptions {
    /** Index in tab collection where tab is to be added. */
    index?: number;
    /** True to immediately activate new tab. */
    activateImmediately?: boolean;
}