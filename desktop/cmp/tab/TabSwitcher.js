/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {hoistComponent, elemFactory, useProvidedModel} from '@xh/hoist/core';
import {tab as blueprintTab, tabs as blueprintTabs} from '@xh/hoist/kit/blueprint';
import {getClassName} from '@xh/hoist/utils/react';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {omit} from 'lodash';
import {withDefault} from '@xh/hoist/utils/js';

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
export const TabSwitcher = hoistComponent({
    displayName: 'TabSwitcher',

    render(props) {
        const model = useProvidedModel(TabContainerModel, props),
            {id, tabs, activeTabId} = model;

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
            ...omit(props, 'model'),
            className: getClassName('xh-tab-switcher', props, `xh-tab-switcher--${orientation}`)
        });
    }
});

TabSwitcher.propTypes = {
    /** Primary component model instance. */
    model: PT.instanceOf(TabContainerModel).isRequired,

    /** Relative position within the parent TabContainer. Defaults to 'top'. */
    orientation: PT.oneOf(['top', 'bottom', 'left', 'right'])
};

export const tabSwitcher = elemFactory(TabSwitcher);
