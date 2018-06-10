/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {tab, tabs} from '@xh/hoist/kit/blueprint';

import {TabContainerModel} from './TabContainerModel';
import './Tabs.scss';
import {hframe, vframe} from '../layout';
import {tabSwitcher} from './TabSwitcher';
import {div} from '../layout/Tags';
import {TabPane} from './TabPane';
import {elem} from '../../core/elem';

/**
 * Display for a TabContainer.
 * @see TabContainerModel
 */
@HoistComponent()
export class TabContainer extends Component {

    render() {
        const {vertical, selectedId, children} = this.model,
            outerCmp = vertical ? hframe : vframe;

        return outerCmp(
            tabSwitcher({model: this.model}),
            div({
                cls: 'xh-tab-container',
                items: children.map(childModel => {
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
            })
        );
    }
}

export const tabContainer = elemFactory(TabContainer);
