/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem, elemFactory, HoistComponent} from '@xh/hoist/core';
import {div, hframe, vframe} from '@xh/hoist/cmp/layout';
import {TabContainerModel} from './TabContainerModel';
import {tabSwitcher} from './TabSwitcher';
import {TabPane} from './TabPane';
import './Tabs.scss';

/**
 * Display for a TabContainer.
 * @see TabContainerModel
 */
@HoistComponent()
export class TabContainer extends Component {

    render() {
        const {tabPosition, vertical, selectedId, children} = this.model,
        switcherBefore = tabPosition === 'left' || tabPosition === 'top',
        switcherAfter = tabPosition === 'right' || tabPosition === 'bottom';

        return (vertical ? hframe : vframe)({
            cls: 'xh-tab-container',
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
                switcherAfter ? tabSwitcher({model: this.model}) : null,
            ]
        });
    }
}

export const tabContainer = elemFactory(TabContainer);
