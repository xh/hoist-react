/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elem, elemFactory, HoistComponent} from '@xh/hoist/core';
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from './TabContainerModel';
import {tabSwitcher} from './TabSwitcher';
import {TabPane} from './TabPane';
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
        /** Position of the switcher relative to the TabPanes. Set to 'none' to opt out of the default TabSwitcher. */
        switcherPosition: PT.oneOf(['top', 'bottom', 'left', 'right', 'none'])
    };

    static defaultProps = {
        switcherPosition: 'top'
    };

    render() {
        const {selectedId, children, componentProps = {}} = this.model,
            {switcherPosition, layoutConfig} = Object.assign({}, this.props, componentProps),
            switcherBefore = switcherPosition === 'left' || switcherPosition === 'top',
            switcherAfter = switcherPosition === 'right' || switcherPosition === 'bottom',
            vertical = switcherPosition === 'left' || switcherPosition === 'right';

        // Default flex = 'auto' if no dimensions / flex specified.
        if (layoutConfig.width === null && layoutConfig.height === null && layoutConfig.flex === null) {
            layoutConfig.flex = 'auto';
        }

        return (vertical ? hbox : vbox)({
            cls: 'xh-tab-container',
            layoutConfig,
            items: [
                switcherBefore ?
                    tabSwitcher({model: this.model, orientation: switcherPosition}) :
                    null,
                ...children.map(childModel => {
                    const childId = childModel.id,
                        isSubContainer = childModel instanceof TabContainerModel,
                        cmpClass = isSubContainer ? TabContainer : TabPane;

                    const style = {};
                    if (childId !== selectedId) {
                        style.display = 'none';
                    }

                    return div({
                        cls: 'xh-tab-panel',
                        style,
                        item: elem(cmpClass, {
                            model: childModel
                        })
                    });
                }),
                switcherAfter ?
                    tabSwitcher({model: this.model, orientation: switcherPosition}) :
                    null
            ]
        });
    }
}

export const tabContainer = elemFactory(TabContainer);
