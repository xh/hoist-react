/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {tab as onsenTab} from '@xh/hoist/mobile/onsen';
import {div} from '@xh/hoist/layout';
import {throwIf} from '@xh/hoist/utils/JsUtils';
import {isPlainObject, uniqBy} from 'lodash';

import {tab} from '../pane/Tab';
import {TabModel} from '../pane/TabModel';

/**
 * Model for a TabContainer, representing its tabs and the currently selected tab.
 */
@HoistModel()
export class TabContainerModel {

    /** TabModels included in this tab container. */
    tabs = [];

    /** ID of the Tab to be active by default. */
    defaultTabId = null;

    /** ID of the currently active Tab. */
    @observable activeTabId = null;

    /** Timestamp of last call to requestRefresh(). Used to refresh children. */
    @observable lastRefreshRequest = null;

    @computed
    get activeTabIndex() {
        const tab = this.findById(this.activeTabId);
        return tab ? this.tabs.indexOf(tab) : 0;
    }

    /**
     * @param {Object[]} tabs - configurations for TabModels (or TabModel instances).
     * @param {String} [defaultTabId] - ID of Tab to be shown initially. If not set, will default to first tab in the provided collection.
     */
    constructor({
        tabs,
        defaultTabId
    }) {
        // 1) Validate and wire tabs, instantiate if needed.
        throwIf(tabs.length == 0,
            'TabContainerModel needs at least one child.'
        );
        throwIf(tabs.length != uniqBy(tabs, 'id').length,
            'One or more tabs in TabContainerModel has a non-unique id.'
        );

        tabs = tabs.map(p => {
            if (isPlainObject(p)) {
                p.parent = this;
                return new TabModel(p);
            }
            return p;
        });
        this.tabs = tabs;

        // 2) Setup and activate default tab
        if (defaultTabId == null) defaultTabId = tabs[0].id;
        this.activeTabId = this.defaultTabId = defaultTabId;
    }

    @action
    setActiveTabIndex(idx) {
        this.setActiveTabId(this.tabs[idx].id);
    }

    @action
    setActiveTabId(id) {
        const tabs = this.tabs,
            tab = this.findById(id);

        if (tab && tab.reloadOnShow) tab.requestRefresh();
        this.activeTabId = tab ? id : tabs[0].id;
    }

    @action
    requestRefresh() {
        this.lastRefreshRequest = Date.now();
    }

    //-------------------------
    // Implementation
    //-------------------------
    findById(id) {
        return this.tabs.find(it => it.id === id);
    }

    renderTabs() {
        return this.tabs.map(tabModel => this.renderTab(tabModel));
    }

    renderTab(tabModel) {
        const {id, label, icon} = tabModel;

        return {
            content: tab({key: id, model: tabModel}),
            tab: onsenTab({
                key: id,
                cls: 'xh-tab',
                items: [
                    div({cls: 'xh-tab-icon', item: icon, omit: !icon}),
                    div({cls: 'xh-tab-label', item: label})
                ]
            })
        };
    }

    destroy() {
        XH.safeDestroy(...this.tabs);
    }
}