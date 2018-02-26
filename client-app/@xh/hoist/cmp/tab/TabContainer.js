/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, hoistComponent} from 'hoist/core';
import {tabs, tab} from 'hoist/kit/blueprint';

import './Tabs.css';
import {tabPane} from './TabPane';
import {TabContainerModel} from './TabContainerModel';

/**
 * Display for a TabContainer.  See TabContainerModel for more details.
 */
@hoistComponent()
export class TabContainer extends Component {

    render() {
        const {id, children, selectedId, vertical} = this.model;

        return tabs({
            id,
            vertical,
            onChange: this.onTabChange,
            selectedTabId: selectedId,
            large: !vertical,
            items: children.map(childModel => {
                const id = childModel.id,
                    isSubContainer = childModel instanceof TabContainerModel,
                    cmp = isSubContainer ? tabContainer : tabPane;
                return tab({
                    id,
                    title: id,
                    panel: cmp({model: childModel})
                });
            })
        });
    }

    //--------------------------
    // Implementation
    //--------------------------
    onTabChange = (activeId) => {
        this.model.setSelectedId(activeId);
    }
}
export const tabContainer = elemFactory(TabContainer);
