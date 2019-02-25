/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {TabRefreshMode, TabRenderMode} from '@xh/hoist/enums';
import {find, uniqBy} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';
import {TabModel} from './TabModel';

/**
 * Model for a TabContainer, representing its layout/contents and the currently displayed Tab.
 *
 * This object provides support for routing based navigation, customizable (lazy) mounting and
 * unmounting of inactive tabs, and customizable refreshing of tabs via a built-in RefreshContext.
 *
 * Note: Routing is currently enabled for desktop applications only.
 */
@HoistModel
export class TabContainerModel {

    /** @member {TabModel[]} */
    @managed tabs = [];

    /** @member {?string} */
    route;

    /** @member {string} */
    @observable activeTabId;

    /** @member {string} */
    switcherPosition;

    /** @member {TabRenderMode} */
    renderMode;

    /** @member {TabRefreshMode} */
    refreshMode;

    /**
     * @param {Object} c - TabContainerModel configuration.
     * @param {Object[]} c.tabs - configs for TabModels to be displayed.
     * @param {?string} [c.defaultTabId] - ID of Tab to be shown initially if routing does not
     *      specify otherwise. If not set, will default to first tab in the provided collection.
     * @param {?string} [c.route] - base route name for this container. If set, this container will
     *      be route-enabled, with the route for each tab being "[route]/[tab.id]".
     * @param {string} [c.switcherPosition] - Position of the switcher docked within this component (or 'none').
     *      Valid values are 'top', 'bottom', 'left', 'right', 'none'.
     * @param {TabRenderMode} [c.renderMode] - strategy for rendering child tabs. Can be set
     *      per-tab via `TabModel.renderMode`. See enum for description of supported modes.
     * @param {TabRefreshMode} [c.refreshMode] - strategy for refreshing child tabs. Can be set
     *      per-tab via `TabModel.refreshMode`. See enum for description of supported modes.
     */
    constructor({
        tabs,
        defaultTabId = null,
        route = null,
        switcherPosition = XH.isMobile ? 'bottom' : 'top',
        renderMode = TabRenderMode.LAZY,
        refreshMode = TabRefreshMode.ON_SHOW_LAZY
    }) {

        tabs = tabs.filter(p => !p.omit);
        throwIf(tabs.length == 0, 'TabContainerModel needs at least one child.');
        throwIf(tabs.length != uniqBy(tabs, 'id').length, 'One or more tabs in TabContainerModel has a non-unique id.');
        throwIf(!['top', 'bottom', 'left', 'right', 'none'].includes(switcherPosition), 'Unsupported value for switcherPosition.');

        this.switcherPosition = switcherPosition;
        this.renderMode = renderMode;
        this.refreshMode = refreshMode;
        this.activeTabId = find(tabs, {id: defaultTabId}) ? defaultTabId : tabs[0].id;
        this.tabs = tabs.map(p => new TabModel({...p, containerModel: this}));

        if (route) {
            if (XH.isMobile) {
                console.warn('Tab container routing is not supported for mobile applications.');
                return;
            }

            this.route = route;
            this.addReaction({
                track: () => XH.routerState,
                run: this.syncWithRouter
            });

            // Need to do call below separately instead of w/fireImmediately to avoid react warning (!?)
            // (Occurs when routing immediately on load to secondary tab in nested tab set)
            this.syncWithRouter();
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

        const tab = find(this.tabs, {id});
        if (tab.disabled) return;

        const {route} = this;
        if (route) {
            XH.navigate(route + '.' + id);
        } else {
            this.setActiveTabId(id);
        }
    }

    //-------------------------
    // Implementation
    //-------------------------
    @action
    setActiveTabId(id) {
        const tab = find(this.tabs, {id});

        throwIf(!tab, `Unknown Tab ${id} in TabContainer.`);
        throwIf(tab.disabled, `Cannot activate Tab ${id} because it is disabled!`);

        this.activeTabId = id;
    }

    syncWithRouter() {
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
    }

}