/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {tab as blueprintTab, tabs as blueprintTabs} from '@xh/hoist/kit/blueprint';
import {TabContainerModel} from '../container/TabContainerModel';
import {omit} from 'lodash';

/**
 * Component to indicate and control the active tab of a TabContainer.
 *
 * The orientation property controls how this switcher will be rendered.
 * For 'top' or 'bottom' orientations this switcher will be rendered in horizontal mode.
 * For 'left' or 'right' orientations this switcher will be rendered in vertical mode.
 *
 * @see TabContainer
 */
@HoistComponent()
export class TabSwitcher extends Component {
    static propTypes = {
        /** TabContainerModel to be controlled. */
        model: PT.instanceOf(TabContainerModel).isRequired,
        /** Relative position within the parent TabContainer. Defaults to 'top'. */
        orientation: PT.oneOf(['top', 'bottom', 'left', 'right'])
    };

    static defaultProps = {
        orientation: 'top'
    };

    render() {
        const {id, tabs, activeTabId} = this.model,
            {orientation} = this.props,
            vertical = ['left', 'right'].includes(orientation);

        return blueprintTabs({
            cls: `xh-tab-switcher-${orientation}`,
            id,
            vertical,
            onChange: this.onTabChange,
            selectedTabId: activeTabId,
            items: tabs.map(({id, title}) => {
                return blueprintTab({id, title});
            }),
            ...omit(this.props, 'model')
        });
    }

    onTabChange = (activeTabId) => {
        this.model.setActiveTabId(activeTabId);
    };
}
export const tabSwitcher = elemFactory(TabSwitcher);