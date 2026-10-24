/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, placeholder, vbox} from '@xh/hoist/cmp/layout';
import {TabContainerProps, TabSwitcherProps} from '@xh/hoist/cmp/tab';
import '@xh/hoist/mobile/register';
import {getTestId, throwIf} from '@xh/hoist/utils/js';
import {getLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isEmpty, isNull, isObject} from 'lodash';
import {tab} from './Tab';
import {tabSwitcher} from './TabSwitcher';
import './Tabs.scss';

/**
 * Mobile implementation of TabContainer.
 *
 * Renders every tab's content in its own wrapper, showing the active one, with the switcher docked
 * at the top or bottom.
 *
 * @internal
 */
export function tabContainerImpl({
    model,
    className,
    testId,
    domAttrs,
    ...props
}: TabContainerProps) {
    const switcherProps = getSwitcherProps(props),
        layoutProps = getLayoutProps(props),
        orientation = switcherProps?.orientation,
        {tabs, activeTabId} = model;

    throwIf(
        switcherProps && !['top', 'bottom'].includes(orientation),
        "Mobile TabContainer tab switcher orientation must be 'top', or 'bottom'"
    );

    if (isEmpty(tabs)) {
        return vbox({
            ...layoutProps,
            className,
            testId,
            domAttrs,
            item: div({className: 'xh-tab-wrapper', item: placeholder(model.emptyText)})
        });
    }

    const switcher = switcherProps
        ? tabSwitcher({key: 'switcher', testId: getTestId(testId, 'switcher'), ...switcherProps})
        : null;

    return vbox({
        ...layoutProps,
        className: classNames(className, orientation ? `xh-tab-container--${orientation}` : null),
        testId,
        domAttrs,
        items: [
            orientation === 'top' ? switcher : null,
            ...tabs.map(tabModel =>
                div({
                    key: tabModel.id,
                    className: 'xh-tab-wrapper',
                    style: tabModel.id !== activeTabId ? hideStyle : undefined,
                    item: tab({model: tabModel, testId: getTestId(testId, tabModel.id)})
                })
            ),
            orientation === 'bottom' ? switcher : null
        ]
    });
}

function getSwitcherProps(tabContainerProps: TabContainerProps): TabSwitcherProps {
    const {switcher} = tabContainerProps;
    if (switcher === false || isNull(switcher)) return null;
    const ret: TabSwitcherProps = isObject(switcher) ? {...switcher} : {};
    ret.orientation ??= 'bottom';
    return ret;
}

const hideStyle = {display: 'none'};
