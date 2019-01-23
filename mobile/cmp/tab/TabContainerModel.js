/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isPlainObject, uniqBy} from 'lodash';
import {TabModel} from './TabModel';

/**
 * Model for a TabContainer, representing its tabs and the currently selected tab.
 */
@HoistModel
export class TabContainerModel {

    /**
     * TabModels included in this tab container.
     * @member {TabModel[]}
     */
    tabs = [];

    /** ID of the Tab to be active by default. */
    defaultTabId = null;

    /** ID of the currently active Tab. */
    @observable activeTabId = null;

    @computed
    get activeTabIndex() {
        const tab = this.findById(this.activeTabId);
        return tab ? this.tabs.indexOf(tab) : 0;
    }

    /**
     * @param {Object} c - TabContainerModel configuration.
     * @param {Object[]} c.tabs - TabModels or configs to create.
     * @param {string} [c.defaultTabId] - ID of Tab to be shown initially.
     *      If not set, will default to first tab in the provided collection.
     * @param {string} [c.tabRefreshMode] - how to refresh hidden tabs - [always|skipHidden|onShowLazy|onShowAlways].
     */
    constructor({
        tabs,
        defaultTabId,
        tabRefreshMode = 'onShowLazy'
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
        this.tabRefreshMode = tabRefreshMode;
    }

    @action
    setActiveTabIndex(idx) {
        this.setActiveTabId(this.tabs[idx].id);
    }

    @action
    setActiveTabId(id) {
        const tabs = this.tabs,
            tab = this.findById(id);

        this.activeTabId = tab ? id : tabs[0].id;
    }

    //-------------------------
    // Implementation
    //-------------------------
    findById(id) {
        return this.tabs.find(it => it.id === id);
    }

    destroy() {
        XH.safeDestroy(this.tabs);
    }
}