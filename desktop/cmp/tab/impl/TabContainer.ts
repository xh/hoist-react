/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {div, hbox, placeholder, vbox} from '@xh/hoist/cmp/layout';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import '../Tabs.scss';
import {tabSwitcher} from '../TabSwitcher';
import {tab} from './Tab';
import {TabContainerModel, TabContainerProps} from '@xh/hoist/cmp/tab';

/**
 * Desktop implementation of TabContainer.
 * @internal
 */
export function tabContainerImpl({model, className, ...props}: TabContainerProps) {
    const layoutProps = getLayoutProps(props),
        vertical = ['left', 'right'].includes(model.switcher?.orientation),
        container = vertical ? hbox : vbox;

    // Default flex = 'auto' if no dimensions / flex specified.
    if (layoutProps.width === null && layoutProps.height === null && layoutProps.flex === null) {
        layoutProps.flex = 'auto';
    }

    return container({
        ...layoutProps,
        className,
        item: getChildren(model)
    });
}

function getChildren(model: TabContainerModel) {
    const {tabs, activeTabId, switcher} = model,
        switcherBefore = ['left', 'top'].includes(switcher?.orientation),
        switcherAfter = ['right', 'bottom'].includes(switcher?.orientation);

    if (isEmpty(tabs)) {
        return div({
            className: 'xh-tab-wrapper',
            item: placeholder(model.emptyText)
        });
    }

    return [
        switcherBefore ? tabSwitcher({key: 'switcher', ...switcher}) : null,
        ...tabs.map(tabModel => {
            const tabId = tabModel.id,
                style = activeTabId !== tabId ? hideStyle : undefined;

            return div({
                className: 'xh-tab-wrapper',
                style,
                key: tabId,
                item: tab({model: tabModel})
            });
        }),
        switcherAfter ? tabSwitcher({key: 'switcher', ...switcher}) : null
    ];
}

const hideStyle = {display: 'none'};
