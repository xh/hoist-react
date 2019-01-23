/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {uniqBy, find} from 'lodash';
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

    /** ID of the currently active Tab. */
    @observable activeTabId = null;

    @computed
    get activeTabIndex() {
        const {tabs} = this,
            tab = find(tabs, {id: this.activeTabId});
        return tab ? tabs.indexOf(tab) : 0;
    }

    /**
     * @param {Object} c - TabContainerModel configuration.
     * @param {Object[]} c.tabs - configs for TabModels to be displayed.
     * @param {string} [c.defaultTabId] - ID of Tab to be shown initially.
     *      If not set, will default to first tab in the provided collection.
     * @param {string} [c.refreshMode] - how to refresh hidden tabs - [always|skipHidden|onShowLazy|onShowAlways].
     */
    constructor({
        tabs,
        defaultTabId,
        refreshMode = 'onShowLazy'
    }) {
        tabs = tabs.filter(p => !p.omit);
        throwIf(tabs.length == 0, 'TabContainerModel needs at least one child.');
        throwIf(tabs.length != uniqBy(tabs, 'id').length, 'One or more tabs in TabContainerModel has a non-unique id.');

        this.refreshMode = refreshMode;
        this.activeTabId = find(tabs, {id: defaultTabId}) ? defaultTabId : tabs[0].id;
        this.tabs = tabs.map(p => new TabModel({...p, containerModel: this}));
    }

    @action
    setActiveTabIndex(idx) {
        this.setActiveTabId(this.tabs[idx].id);
    }

    @action
    setActiveTabId(id) {
        const tab = find(this.tabs, {id});
        throwIf(!tab, `Unknown Tab ${id} in TabContainer.`);

        this.activeTabId = id;
    }

    //-------------------------
    // Implementation
    //-------------------------
    destroy() {
        XH.safeDestroy(this.tabs);
    }
}