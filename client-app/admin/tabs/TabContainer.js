/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elem} from 'hoist';
import {observer} from 'hoist/mobx';
import {tabs, tab} from 'hoist/kit/blueprint';

import {TabPane} from './TabPane';
import {TabContainerModel} from './TabContainerModel';

/**
 * Enhanced TabContainer for Admin App.
 */
@observer
export class TabContainer extends Component {

    render() {
        const model = this.props.model;

        return tabs({
            id: model.id,
            onChange: model.changeTab,
            selectedTabId: model.selectedTabId,
            vertical: model.orientation === 'v',
            items: model.children.map(childModel => {
                const Cmp = childModel instanceof TabContainerModel ? TabContainer : TabPane;
                return tab({
                    id: childModel.id,
                    title: childModel.id,
                    panel: elem(Cmp, {model: childModel})
                });
            })
        });
    }
}
