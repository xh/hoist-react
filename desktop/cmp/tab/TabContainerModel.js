/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {find, uniqBy} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';
import {TabModel} from './TabModel';

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

    /** ID of the currently active Tab. */
    @observable activeTabId = null;

    /** How should this container render hidden tabs? */
    tabRenderMode = null;

    /** How should this container refresh hidden tabs? */
    tabRefreshMode = null;

    /**
     * @param {Object} c - TabContainerModel configuration.
     * @param {Object[]} c.tabs - configs for TabModels to be displayed.
     * @param {?string} [c.defaultTabId] - ID of Tab to be shown initially if routing does not
     *      specify otherwise. If not set, will default to first tab in the provided collection.
     * @param {?string} [c.route] - base route name for this container. If set, this container will
     *      be route-enabled, with the route for each tab being "[route]/[tab.id]".
     * @param {?string} [c.tabRenderMode] - how to render hidden tabs - [always|lazy|unmountOnHide].
     * @param {?string} [c.tabRefreshMode] - how to refresh hidden tabs - [always|skipHidden|onShowLazy|onShowAlways].
     */
    constructor({
        tabs,
        defaultTabId = null,
        route = null,
        tabRenderMode = 'lazy',
        tabRefreshMode = 'onShowLazy'
    }) {

        tabs = tabs.filter(p => !p.omit);
        throwIf(tabs.length == 0, 'TabContainerModel needs at least one child.');
        throwIf(tabs.length != uniqBy(tabs, 'id').length, 'One or more tabs in TabContainerModel has a non-unique id.');

        this.tabRenderMode = tabRenderMode;
        this.tabRefreshMode = tabRefreshMode;
        this.activeTabId = find(tabs, {id: defaultTabId}) ? defaultTabId : tabs[0].id;
        this.tabs = tabs.map(p => new TabModel({...p, containerModel: this}));
        
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