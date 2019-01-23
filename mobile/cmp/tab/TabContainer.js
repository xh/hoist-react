/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {tab as onsenTab, tabbar} from '@xh/hoist/kit/onsen';
import {tab} from './impl/Tab';
import {TabContainerModel} from './TabContainerModel';
import {div} from '@xh/hoist/cmp/layout';

/**
 * Display for a TabContainer.
 */
@HoistComponent
export class TabContainer extends Component {

    static modelClass = TabContainerModel;

    render() {
        const {model} = this,
            {activeTabIndex} = model;

        return tabbar({
            index: activeTabIndex,
            renderTabs: () => this.tabs.map(tabModel => this.renderTab(tabModel)),
            onPreChange: (event) => model.setActiveTabIndex(event.index)
        });
    }

    renderTab(tabModel) {
        const {id, label, icon} = tabModel;

        return {
            content: tab({key: id, model: tabModel}),
            tab: onsenTab({
                key: id,
                className: 'xh-tab',
                items: [
                    div({className: 'xh-tab-icon', item: icon, omit: !icon}),
                    div({className: 'xh-tab-label', item: label})
                ]
            })
        };
    }
}
export const tabContainer = elemFactory(TabContainer);