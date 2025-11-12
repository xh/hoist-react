/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {div, hbox, placeholder, vbox} from '@xh/hoist/cmp/layout';
import {TabContainerModel, TabContainerProps} from '@xh/hoist/cmp/tab';
import {TabSwitcherProps} from '@xh/hoist/cmp/tab/Types';
import {getTestId} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import {isEmpty, isObject} from 'lodash';
import '../Tabs.scss';
import {tabSwitcher} from '../TabSwitcher';
import {dynamicTabSwitcher} from '../dynamic/DynamicTabSwitcher';
import {tab} from './Tab';

/**
 * Desktop implementation of TabContainer.
 * @internal
 */
export function tabContainerImpl({
    model,
    childTabContainerProps,
    className,
    testId,
    ...props
}: TabContainerProps) {
    const switcher: TabSwitcherProps = isObject(props.switcher)
            ? props.switcher
            : props.switcher === false
              ? null
              : {orientation: 'top'},
        layoutProps = getLayoutProps(props),
        vertical = ['left', 'right'].includes(switcher?.orientation),
        container = vertical ? hbox : vbox;

    // Default flex = 'auto' if no dimensions / flex specified.
    if (layoutProps.width === null && layoutProps.height === null && layoutProps.flex === null) {
        layoutProps.flex = 'auto';
    }

    return container({
        ...layoutProps,
        className,
        testId,
        item: getChildren(model, switcher, testId, childTabContainerProps)
    });
}

function getChildren(
    model: TabContainerModel,
    switcher: TabSwitcherProps,
    testId: string,
    childTabContainerProps: TabContainerProps['childTabContainerProps']
) {
    const {tabs} = model;
    if (isEmpty(tabs)) {
        return div({className: 'xh-tab-wrapper', item: placeholder(model.emptyText)});
    }

    const {activeTabId, dynamicTabSwitcherModel} = model,
        switcherBefore = ['left', 'top'].includes(switcher?.orientation),
        switcherAfter = ['right', 'bottom'].includes(switcher?.orientation),
        switcherImpl = dynamicTabSwitcherModel ? dynamicTabSwitcher : tabSwitcher,
        switcherCmp = switcher
            ? switcherImpl({key: 'switcher', testId: getTestId(testId, 'switcher'), ...switcher})
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
                item: tab({
                    childTabContainerProps,
                    model: tabModel,
                    testId: getTestId(testId, tabId)
                })
            });
        }),
        switcherAfter ? switcherCmp : null
    ];
}

const hideStyle = {display: 'none'};
