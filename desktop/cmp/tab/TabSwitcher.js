/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {tab as blueprintTab, tabs as blueprintTabs} from '@xh/hoist/kit/blueprint';
import {TabContainerModel} from '@xh/hoist/cmp/tab';
import {omit} from 'lodash';

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
@HoistComponent
export class TabSwitcher extends Component {

    static modelClass = TabContainerModel;

    static propTypes = {
        /** Relative position within the parent TabContainer. Defaults to 'top'. */
        orientation: PT.oneOf(['top', 'bottom', 'left', 'right'])
    };

    static defaultProps = {
        orientation: 'top'
    };

    baseClassName = 'xh-tab-switcher';

    render() {
        const {id, tabs, activeTabId} = this.model,
            {orientation} = this.props,
            vertical = ['left', 'right'].includes(orientation);

        return blueprintTabs({
            id,
            vertical,
            onChange: this.onTabChange,
            selectedTabId: activeTabId,
            items: tabs.map(({id, title, icon, disabled, excludeFromSwitcher}) => {
                if (excludeFromSwitcher) return null;
                return blueprintTab({
                    id,
                    disabled,
                    items: [icon, title]
                });
            }),
            ...omit(this.props, 'model'),
            className: this.getClassName(`xh-tab-switcher--${orientation}`)
        });
    }

    onTabChange = (activeTabId) => {
        this.model.activateTab(activeTabId);
    };
}
export const tabSwitcher = elemFactory(TabSwitcher);