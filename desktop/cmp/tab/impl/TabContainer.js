/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistElemFactory, useProvidedModel, useLayoutProps} from '@xh/hoist/core';
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
export const tabContainer = hoistElemFactory({
    displayName: 'TabContainer',

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
            className: getClassName('xh-tab-container', props),
            items: [
                switcherBefore ? tabSwitcher({model, key: 'switcher', orientation: switcherPosition}) : null,
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
                switcherAfter ? tabSwitcher({model, key: 'switcher', orientation: switcherPosition}) : null
            ]
        });
    }
});

const hideStyle = {display: 'none'};

