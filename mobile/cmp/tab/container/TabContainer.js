/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {tabbar} from '@xh/hoist/kit/onsen';

/**
 * Display for a TabContainer.
 * @see TabContainerModel
 */
@HoistComponent
export class TabContainer extends Component {

    render() {
        const {model} = this,
            {activeTabIndex} = model;

        return tabbar({
            index: activeTabIndex,
            renderTabs: () => model.renderTabs(),
            onPreChange: (event) => model.setActiveTabIndex(event.index)
        });
    }

}

export const tabContainer = elemFactory(TabContainer);