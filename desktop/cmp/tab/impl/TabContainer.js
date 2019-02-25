/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from '@xh/hoist/cmp/tab';

import {tab} from './Tab';
import {tabSwitcher} from '../TabSwitcher';
import '../Tabs.scss';

/**
 * Desktop implementation of TabContainer.
 *
 * @private
 */
@HoistComponent
@LayoutSupport
export class TabContainer extends Component {

    static modelClass = TabContainerModel;

    baseClassName = 'xh-tab-container';

    render() {
        const {model} = this,
            {activeTabId, tabs, switcherPosition} = model,
            switcherBefore = ['left', 'top'].includes(switcherPosition),
            switcherAfter = ['right', 'bottom'].includes(switcherPosition),
            vertical = ['left', 'right'].includes(switcherPosition),
            container = vertical ? hbox : vbox;

        // Default flex = 'auto' if no dimensions / flex specified.
        const layoutProps = this.getLayoutProps();
        if (layoutProps.width === null && layoutProps.height === null && layoutProps.flex === null) {
            layoutProps.flex = 'auto';
        }

        return container({
            ...layoutProps,
            className: this.getClassName(),
            items: [
                switcherBefore ? tabSwitcher({model, orientation: switcherPosition}) : null,
                ...tabs.map(tabModel => {
                    const tabId = tabModel.id,
                        style = {};

                    if (tabId !== activeTabId) {
                        style.display = 'none';
                    }

                    return div({
                        className: 'xh-tab-wrapper',
                        style,
                        item: tab({model: tabModel})
                    });
                }),
                switcherAfter ? tabSwitcher({model, orientation: switcherPosition}) : null
            ]
        });
    }
}
export const tabContainer = elemFactory(TabContainer);
