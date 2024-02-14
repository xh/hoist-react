/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {div, hbox, placeholder, vbox} from '@xh/hoist/cmp/layout';
import {TabContainerModel, TabContainerProps} from '@xh/hoist/cmp/tab';
import {getTestId} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
import '../Tabs.scss';
import {tabSwitcher} from '../TabSwitcher';
import {tab} from './Tab';

/**
 * Desktop implementation of TabContainer.
 * @internal
 */
export function tabContainerImpl({model, className, testId, ...props}: TabContainerProps) {
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
        testId,
        item: getChildren(model, testId)
    });
}

function getChildren(model: TabContainerModel, testId: string) {
    const {tabs} = model;
    if (isEmpty(tabs)) {
        return div({className: 'xh-tab-wrapper', item: placeholder(model.emptyText)});
    }

    const {activeTabId, switcher} = model,
        switcherBefore = ['left', 'top'].includes(switcher?.orientation),
        switcherAfter = ['right', 'bottom'].includes(switcher?.orientation),
        switcherCmp = switcher
            ? tabSwitcher({key: 'switcher', testId: getTestId(testId, 'switcher'), ...switcher})
            : null;

    return [
        switcherBefore ? switcherCmp : null,
        ...tabs.map(tabModel => {
            const tabId = tabModel.id,
                style = activeTabId !== tabId ? hideStyle : undefined;

            return div({
                className: 'xh-tab-wrapper',
                style,
                key: tabId,
                item: tab({model: tabModel, testId: getTestId(testId, tabId)})
            });
        }),
        switcherAfter ? switcherCmp : null
    ];
}

const hideStyle = {display: 'none'};
