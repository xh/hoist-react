/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '../../core';
import {tab, tabs} from '@xh/hoist/kit/blueprint';
import {TabContainerModel} from './TabContainerModel';

/**
 * Switcher display for a TabContainer.
 *
 * This TabSwitcher controls the selected tab of a TabContainer via a shared TabContainerModel,
 * which is expected to be provided to this TabSwitcher.
 *
 * The switcherPosition configuration on the TabContainerModel controls how this switcher will be
 * rendered. For 'top' or 'bottom' switcherPositions this switcher will be rendered in horizontal
 * and large mode. For 'left' or 'right' switcher positions this switcher will be rendered in
 * vertical mode.
 *
 * @see TabContainerModel
 */
@HoistComponent()
export class TabSwitcher extends Component {
    static propTypes = {
        /** Model to switch tabs on. Should be shared with a TabContainer. */
        model: PT.instanceOf(TabContainerModel)
    };

    render() {
        const {switcherPosition, vertical, id, children, selectedId} = this.model;
        return tabs({
            cls: `xh-tab-switcher-${switcherPosition}`,
            id,
            vertical,
            onChange: this.onTabChange,
            large: !vertical,
            selectedTabId: selectedId,
            items: children.map(({id, name}) => tab({id, title: name})),
            ...this.props
        });
    }

    onTabChange = (activeId) => {
        this.model.setSelectedId(activeId);
    };
}

export const tabSwitcher = elemFactory(TabSwitcher);