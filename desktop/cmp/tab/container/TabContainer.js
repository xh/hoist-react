/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';

import {TabContainerModel} from './TabContainerModel';
import {tabSwitcher} from '../switcher/TabSwitcher';
import {tab} from '../pane/Tab';
import '../Tabs.scss';

/**
 * Display a set of child Tabs and (optionally) a switcher control.
 *
 * By default this TabContainer will install a TabSwitcher above the Tabs to control the currently
 * displayed Tab. The 'switcherPosition' property can be adjusted to place the switcher control on
 * alternative edges of the container. If the switcherPosition is set to 'none' then no TabSwitcher
 * will be installed.  This latter case is useful for applications that wish to place an associated
 * TabSwitcher elsewhere in the graphical hierarchy (e.g. a shared menu bar), or control the visible
 * Tab directly via other means.
 *
 * Other than switcher position and optional layout support, this component's TabContainerModel
 * configures all other relevant aspects of this container, including its children.
 *
 * @see TabContainerModel
 */
@HoistComponent()
@LayoutSupport
export class TabContainer extends Component {

    static propTypes = {
        /** The controlling TabContainerModel instance. */
        model: PT.instanceOf(TabContainerModel).isRequired,
        /** Position of the switcher docked within this component (or 'none'). */
        switcherPosition: PT.oneOf(['top', 'bottom', 'left', 'right', 'none'])
    };

    static defaultProps = {
        switcherPosition: 'top'
    };

    render() {
        const {model} = this,
            {activeTabId, tabs} = model,
            {switcherPosition, layoutConfig} = this.props,
            switcherBefore = ['left', 'top'].includes(switcherPosition),
            switcherAfter = ['right', 'bottom'].includes(switcherPosition),
            vertical = ['left', 'right'].includes(switcherPosition),
            container = vertical ? hbox : vbox;

        // Default flex = 'auto' if no dimensions / flex specified.
        if (layoutConfig.width === null && layoutConfig.height === null && layoutConfig.flex === null) {
            layoutConfig.flex = 'auto';
        }

        return container({
            cls: 'xh-tab-container',
            layoutConfig,
            items: [
                switcherBefore ? tabSwitcher({model, orientation: switcherPosition}) : null,
                ...tabs.map(tabModel => {
                    const tabId = tabModel.id,
                        style = {};

                    if (tabId !== activeTabId) {
                        style.display = 'none';
                    }

                    return div({
                        cls: 'xh-tab-panel',
                        style,
                        item: tab({model: tabModel})
                    });
                }),
                switcherAfter ? tabSwitcher({model, orientation: switcherPosition}) : null
            ]
        });
    }
}
export const tabContainer = elemFactory(TabContainer);
