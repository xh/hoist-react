/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {tab as onsenTab, tabbar} from '@xh/hoist/kit/onsen';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {throwIf} from '@xh/hoist/utils/js';
import {tab} from './Tab';

import './Tabs.scss';

/**
 * Mobile Implementation of TabContainer.
 *
 * @private
 */
@HoistComponent
export class TabContainer extends Component {

    static modelClass = TabContainerModel;

    baseClassName = 'xh-tabbar';

    constructor(props) {
        super(props);
        throwIf(
            !['top', 'bottom'].includes(this.model.switcherPosition),
            'Mobile TabContainer only supports top and bottom tab switcher positions at this time.'
        );
    }

    render() {
        const {model} = this,
            {activeTab, switcherPosition} = model,
            tabs = model.tabs.filter(it => !it.excludeFromSwitcher);

        return tabbar({
            className: this.getClassName(`xh-tabbar-${switcherPosition}`),
            position: switcherPosition,
            index: activeTab ? tabs.indexOf(activeTab) : 0,
            renderTabs: () => tabs.map(tabModel => this.renderTab(tabModel)),
            onPreChange: (e) => model.activateTab(tabs[e.index].id)
        });
    }

    renderTab(tabModel) {
        const {id, title, icon} = tabModel;

        return {
            content: tab({key: id, model: tabModel}),
            tab: onsenTab({
                key: id,
                className: 'xh-tab',
                items: [
                    div({className: 'xh-tab-icon', item: icon, omit: !icon}),
                    div({className: 'xh-tab-label', item: title})
                ]
            })
        };
    }
}
export const tabContainer = elemFactory(TabContainer);