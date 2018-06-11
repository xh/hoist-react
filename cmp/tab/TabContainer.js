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
        const {vertical, selectedId, children} = this.model,
            outerCmp = vertical ? hframe : vframe;

        return outerCmp({
            cls: 'xh-tab-container',
            items: [
                tabSwitcher({model: this.model}),
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
                })
            ]
        });
    }
}

export const tabContainer = elemFactory(TabContainer);
