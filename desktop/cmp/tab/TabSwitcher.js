/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/desktop/cmp/button';
import {hoistCmp, uses} from '@xh/hoist/core';
import {tab as blueprintTab, tabs as blueprintTabs} from '@xh/hoist/kit/blueprint';
import {withDefault} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import PT from 'prop-types';

/**
 * Component to indicate and control the active tab of a TabContainer.
 *
 * The orientation property controls how this switcher will be rendered.
 * For 'top' or 'bottom' orientations this switcher will be rendered in horizontal mode.
 * For 'left' or 'right' orientations this switcher will be rendered in vertical mode.
 *
 * @see TabContainer
 * @see TabContainerModel
 */
export const [TabSwitcher, tabSwitcher] = hoistCmp.withFactory({
    displayName: 'TabSwitcher',
    model: uses(TabContainerModel),
    className: 'xh-tab-switcher',

    render({model, className, animate, ...props}) {
        const {id, tabs, activeTabId} = model;

        const orientation = withDefault(props.orientation, 'top'),
            vertical = ['left', 'right'].includes(orientation);

        const items = tabs.map(tab => {
            const {id, title, icon, disabled, showRemoveAction, excludeFromSwitcher} = tab;
            if (excludeFromSwitcher) return null;
            return blueprintTab({
                id,
                disabled,
                items: [
                    icon,
                    title,
                    button({
                        omit: !showRemoveAction,
                        icon: Icon.x(),
                        onClick: () => tab.containerModel.removeTab(tab)
                    })
                ]
            });
        });

        return blueprintTabs({
            id,
            vertical,
            onChange: (tabId) => model.activateTab(tabId),
            selectedTabId: activeTabId,
            items,
            ...props,
            animate: withDefault(animate, false),
            className: classNames(className, `xh-tab-switcher--${orientation}`)
        });
    }
});

TabSwitcher.propTypes = {
    /** True to animate the indicator when switching tabs. False (default) to change instantly. */
    animate: PT.bool,

    /** Primary component model instance. */
    model: PT.instanceOf(TabContainerModel),

    /** Relative position within the parent TabContainer. Defaults to 'top'. */
    orientation: PT.oneOf(['top', 'bottom', 'left', 'right'])
};