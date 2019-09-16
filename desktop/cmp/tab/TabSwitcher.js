/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {hoistCmp, uses} from '@xh/hoist/core';
import {tab as blueprintTab, tabs as blueprintTabs} from '@xh/hoist/kit/blueprint';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {withDefault} from '@xh/hoist/utils/js';

import classNames from 'classnames';

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

    render({model, className, ...props}) {
        const {id, tabs, activeTabId} = model;

        const orientation = withDefault(props.orientation, 'top'),
            vertical = ['left', 'right'].includes(orientation);

        return blueprintTabs({
            id,
            vertical,
            onChange: (tabId) => model.activateTab(tabId),
            selectedTabId: activeTabId,
            items: tabs.map(({id, title, icon, disabled, excludeFromSwitcher}) => {
                if (excludeFromSwitcher) return null;
                return blueprintTab({
                    id,
                    disabled,
                    items: [icon, title]
                });
            }),
            ...props,
            className: classNames(className, `xh-tab-switcher--${orientation}`)
        });
    }
});

TabSwitcher.propTypes = {
    /** Primary component model instance. */
    model: PT.instanceOf(TabContainerModel),

    /** Relative position within the parent TabContainer. Defaults to 'top'. */
    orientation: PT.oneOf(['top', 'bottom', 'left', 'right'])
};