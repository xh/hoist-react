/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmpFactory, receive,  useLayoutProps} from '@xh/hoist/core';
import {getClassName} from '@xh/hoist/utils/react';
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from '@xh/hoist/cmp/tab';

import {tab} from './Tab';
import {tabSwitcher} from '../TabSwitcher';
import '../Tabs.scss';

/**
 * Desktop implementation of TabContainer.
 * @private
 */
export const tabContainer = hoistCmpFactory({
    displayName: 'TabContainer',
    model: receive(TabContainerModel, {provide: true}),

    render({model, ...props}) {
        const {activeTabId, tabs, switcherPosition} = model,
            [layoutProps] = useLayoutProps(props),
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
            className: getClassName('xh-tab-container', props),
            items: [
                switcherBefore ? tabSwitcher({key: 'switcher', orientation: switcherPosition}) : null,
                ...tabs.map(tabModel => {
                    const tabId = tabModel.id,
                        style = (activeTabId !== tabId) ? hideStyle : undefined;

                    return div({
                        className: 'xh-tab-wrapper',
                        style,
                        key: tabId,
                        item: tab({model: tabModel})
                    });
                }),
                switcherAfter ? tabSwitcher({key: 'switcher', orientation: switcherPosition}) : null
            ]
        });
    }
});

const hideStyle = {display: 'none'};

