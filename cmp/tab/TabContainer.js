/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem, elemFactory, HoistComponent} from '@xh/hoist/core';
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from './TabContainerModel';
import {tabSwitcher} from './TabSwitcher';
import {TabPane} from './TabPane';
import './Tabs.scss';

/**
 * Display for a TabContainer.
 * @see TabContainerModel
 */
@HoistComponent({layoutSupport: true})
export class TabContainer extends Component {

    render() {
        const {switcherPosition, vertical, selectedId, children} = this.model,
            switcherBefore = switcherPosition === 'left' || switcherPosition === 'top',
            switcherAfter = switcherPosition === 'right' || switcherPosition === 'bottom',
            {layoutConfig} = this.props;

        // Default flex = 'auto' if no dimensions / flex specified.
        if (layoutConfig.width === null && layoutConfig.height === null && layoutConfig.flex === null) {
            layoutConfig.flex = 'auto';
        }

        return (vertical ? hbox : vbox)({
            cls: 'xh-tab-container',
            layoutConfig,
            items: [
                switcherBefore ? tabSwitcher({model: this.model}) : null,
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
                switcherAfter ? tabSwitcher({model: this.model}) : null
            ]
        });
    }
}

export const tabContainer = elemFactory(TabContainer);
