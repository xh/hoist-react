/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {tab as onsenTab} from '@xh/hoist/kit/onsen';
import {div} from '@xh/hoist/cmp/layout';
import {throwIf} from '@xh/hoist/utils/JsUtils';
import {uniqBy} from 'lodash';

import {tabPane} from './TabPane';
import {TabPaneModel} from './TabPaneModel';

/**
 * Model for a TabContainer, representing its tabs and the currently selected tab.
 */
@HoistModel()
export class TabContainerModel {
    tabs = [];
    @observable selectedId = null;
    @observable lastRefreshRequest = null;

    @computed
    get selectedIndex() {
        const tab = this.findById(this.selectedId);
        return tab ? this.tabs.indexOf(tab) : 0;
    }

    /**
     * @param {Object[]} tabs - configurations for TabPaneModels.
     * @param {String} [selectedId] - id for initially selected tab.
     */
    constructor({
        tabs,
        selectedId
    }) {
        tabs = tabs.map(tabCfg => {
            tabCfg.parent = this;
            return new TabPaneModel(tabCfg);
        });

        // Validate and wire children
        throwIf(tabs.length == 0,
            'TabContainerModel needs at least one child.'
        );
        throwIf(tabs.length != uniqBy(tabs, 'id').length,
            'One or more tabs in TabContainerModel has a non-unique id.'
        );

        this.tabs = tabs;
        this.setSelectedId(selectedId || tabs[0].id);
    }

    @action
    setSelectedIndex(idx) {
        this.setSelectedId(this.tabs[idx].id);
    }

    @action
    setSelectedId(id) {
        const tabs = this.tabs,
            tab = this.findById(id);

        if (tab && tab.reloadOnShow) tab.requestRefresh();
        this.selectedId = tab ? id : tabs[0].id;
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
        return this.tabs.map(tabPaneModel => this.renderTab(tabPaneModel));
    }

    renderTab(tabPaneModel) {
        const {id, label, icon} = tabPaneModel;

        return {
            content: tabPane({key: id, model: tabPaneModel}),
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