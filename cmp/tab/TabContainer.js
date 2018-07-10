/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';

import {tabSwitcher} from './TabSwitcher';
import {tabPane} from './TabPane';
import './Tabs.scss';

/**
 * Display a set of TabPanes and (optionally) a switcher control.
 *
 * By default this TabContainer will install a TabSwitcher above the TabPanes to control the
 * currently displayed TabPane. The 'switcherPosition' property can be adjusted to place the switcher
 * control on alternative edges of the container; if the switcherPosition is set to 'none' then
 * no TabSwitcher will be installed.  This latter case is useful for applications that wish to place an associated
 * TabSwitcher elsewhere in the graphical hierarchy (e.g. a shared menu bar), or control the visible pane
 * directly via other means.
 *
 * @see TabContainerModel
 */
@HoistComponent({layoutSupport: true})
export class TabContainer extends Component {
    static propTypes = {
        /**
         * Position of the switcher relative to the TabPanes.
         * Set to 'none' to opt out of the default TabSwitcher.
         */
        switcherPosition: PT.oneOf(['top', 'bottom', 'left', 'right', 'none'])
    };

    static defaultProps = {
        switcherPosition: 'top'
    };

    render() {
        const {model} = this,
            {activePaneId, panes} = model,
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
                ...panes.map(paneModel => {
                    const paneId = paneModel.id,
                        style = {};

                    if (paneId !== activePaneId) {
                        style.display = 'none';
                    }

                    return div({
                        cls: 'xh-tab-panel',
                        style,
                        item: tabPane({model: paneModel})
                    });
                }),
                switcherAfter ? tabSwitcher({model, orientation: switcherPosition}) : null
            ]
        });
    }
}
export const tabContainer = elemFactory(TabContainer);
