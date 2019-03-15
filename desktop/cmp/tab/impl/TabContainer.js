/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent, useProvidedModel, useClassName, useLayoutProps} from '@xh/hoist/core';
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
export const [TabContainer, tabContainer] = hoistComponent({
    render(props) {
        const model = useProvidedModel(TabContainerModel, props),
            [layoutProps] = useLayoutProps(props),
            {activeTabId, tabs, switcherPosition} = model,
            switcherBefore = ['left', 'top'].includes(switcherPosition),
            switcherAfter = ['right', 'bottom'].includes(switcherPosition),
            vertical = ['left', 'right'].includes(switcherPosition),
            container = vertical ? hbox : vbox;

        // Default flex = 'auto' if no dimensions / flex specified.
        if (layoutProps.width === null && layoutProps.height === null && layoutProps.flex === null) {
            layoutProps.flex = 'auto';
        }

        return container({
            ...layoutProps,
            className: useClassName('xh-tab-container', props),
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
});
