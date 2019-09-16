/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {getLayoutProps} from '@xh/hoist/utils/react';
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';

import {tab} from './Tab';
import {tabSwitcher} from '../TabSwitcher';
import '../Tabs.scss';

/**
 * Desktop implementation of TabContainer.
 * @private
 */
export function tabContainerImpl({model, className, ...props}) {
    const {activeTabId, tabs, switcherPosition} = model,
        layoutProps = getLayoutProps(props),
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
        className,
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

const hideStyle = {display: 'none'};

