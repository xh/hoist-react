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
 * Display for a TabContainer.
 *
 * By default this TabContainer will install a TabSwitcher above the TabPanes to control the
 * selected TabPane. If the switcherPosition is set to 'none' then no TabSwitcher will be installed
 * and it will be up to the application to handle setting the selected id on this TabContainerModel
 * when appropriate.
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
