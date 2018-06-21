/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {tab, tabs} from '@xh/hoist/kit/blueprint';
import {TabContainerModel} from './TabContainerModel';
import {omit} from 'lodash';

/**
 * Switcher display for a TabContainer.
 *
 * This TabSwitcher controls the selected tab of a TabContainer via a shared TabContainerModel,
 * which is expected to be provided to this TabSwitcher.
 *
 * The orientation property controls how this switcher will be rendered. For 'top' or 'bottom'
 * orientations this switcher will be rendered in horizontal mode. For 'left' or 'right'
 * orientations this switcher will be rendered in vertical mode.
 *
 * @see TabContainerModel
 */
@HoistComponent()
export class TabSwitcher extends Component {
    static propTypes = {
        /** Model to switch tabs on. Should be shared with a TabContainer. */
        model: PT.instanceOf(TabContainerModel),
        /** The position relative to the TabContainer this switcher is controlling. Defaults to 'top'. */
        orientation: PT.oneOf(['top', 'bottom', 'left', 'right'])
    };

    static defaultProps = {
        orientation: 'top'
    };

    render() {
        const {id, children, selectedId} = this.model,
            {orientation} = this.props,
            vertical = orientation === 'left' || orientation === 'right';

        return tabs({
            cls: `xh-tab-switcher-${orientation}`,
            id,
            vertical,
            onChange: this.onTabChange,
            selectedTabId: selectedId,
            items: children.map(({id, name}) => tab({id, title: name})),
            ...omit(this.props, 'model')
        });
    }

    onTabChange = (activeId) => {
        this.model.setSelectedId(activeId);
    };
}

export const tabSwitcher = elemFactory(TabSwitcher);