/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {find, isPlainObject, uniqBy} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';
import {TabModel} from '@xh/hoist/desktop/cmp/tab';

/**
 * Model for a TabContainer, representing its layout/contents and the currently displayed Tab.
 *
 * This object provides support for routing based navigation, managed mounting/unmounting of
 * inactive tabs, and lazy refreshing of its active Tab.
 */
@HoistModel
export class TabContainerModel {

    /**
     * TabModels included in this tab container.
     * @member {TabModel[]}
     */
    tabs = [];

    /** Base route for this container. */
    route = null;

    /** ID of the Tab to be active by default. */
    defaultTabId = null;

    /** ID of the currently active Tab. */
    @observable activeTabId = null;

    /** How should this container render hidden tabs? */
    tabRenderMode = null;

    /**
     * @param {Object} c - TabContainerModel configuration.
     * @param {Object[]} c.tabs - configs for TabModels (or TabModel instances) to be displayed
     *      by this container.
     * @param {?string} [c.defaultTabId] - ID of Tab to be shown initially if routing does not
     *      specify otherwise. If not set, will default to first tab in the provided collection.
     * @param {?string} [c.route] - base route name for this container. If set, this container will
     *      be route-enabled, with the route for each tab being "[route]/[tab.id]".
     * @param {?string} [c.tabRenderMode] - how to render hidden tabs - [lazy|always|unmountOnHide].
     */
    constructor({
        tabs,
        defaultTabId = null,
        route = null,
        tabRenderMode = 'lazy'
    }) {
        this.tabRenderMode = tabRenderMode;

        // 1) Validate and wire tabs, instantiate if needed.
        const childIds = uniqBy(tabs, 'id');
        throwIf(tabs.length == 0, 'TabContainerModel needs at least one child tab.');
        throwIf(tabs.length != childIds.length, 'One or more Tabs in TabContainer has a non-unique ID.');

        tabs = tabs.filter(p => !p.omit);
        tabs = tabs.map(p => isPlainObject(p) ? new TabModel(p) : p);
        tabs.forEach(p => p.containerModel = this);
        this.tabs = tabs;

        // 2) Setup and activate default tab
        if (defaultTabId == null) {
            defaultTabId = tabs[0].id;
        }
        this.activeTabId = this.defaultTabId = defaultTabId;

        // 3) Setup routes
        this.route = route;
        if (route) {
            this.addReaction(this.routerReaction());
        }
    }

    /** @type TabModel */
    get activeTab() {
        return find(this.tabs, {id: this.activeTabId});
    }

    /**
     * Set the currently active Tab.
     *
     * If using routing, this method will navigate to the new tab via the router and the active Tab
     * will only be updated once the router state changes. Otherwise the active Tab will be updated
     * immediately.
     *
     * @param {string} id - unique ID of Tab to activate.
     */
    activateTab(id) {
        if (this.activeTabId === id) return;

        const tab = this.getTabById(id);
        if (tab.disabled) return;

        const {route} = this;
        if (route) {
            XH.navigate(route + '.' + id);
        } else {
            this.setActiveTabId(id);
        }
    }

    /**
     * Immediately refresh active tab and require a refresh of all other tabs when next shown.
     * @param {boolean} userInitiated - true if the refresh was triggered by user action,
     *  false if triggered programmatically.
     */
    requestRefresh(userInitiated = false) {
        this.tabs.forEach(it => it.requestRefresh(userInitiated));
    }

    /**
     * @param {string} id - unique ID of the Tab to retrieve
     * @returns {TabModel} - the tab, or null if not found
     */
    getTabById(id) {
        return find(this.tabs, {id});
    }

    //-------------------------
    // Implementation
    //-------------------------
    @action
    setActiveTabId(id) {
        const tab = this.getTabById(id);

        throwIf(!tab, `Unknown Tab ${id} in TabContainer.`);
        throwIf(tab.disabled, `Cannot activate Tab ${id} because it is disabled!`);

        this.activeTabId = id;
        if (tab.reloadOnShow) tab.requestRefresh();
    }

    routerReaction() {
        return {
            track: () => XH.routerState,
            run: () => {
                const {tabs, route} = this,
                    {router} = XH;

                if (router.isActive(route)) {
                    const activateTab = tabs.find(tab => {
                        return router.isActive(route + '.' + tab.id) && !tab.isActive && !tab.disabled;
                    });

                    if (activateTab) {
                        this.setActiveTabId(activateTab.id);
                    }
                }
            },
            fireImmediately: true
        };
    }

    destroy() {
        XH.safeDestroy(this.tabs);
    }
}