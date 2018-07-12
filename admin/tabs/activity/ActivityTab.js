/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {tabContainer, TabContainerModel} from '@xh/hoist/desktop/cmp/tab';

import {TrackingPanel} from './tracking/TrackingPanel';
import {ClientErrorPanel} from './clienterrors/ClientErrorPanel';
import {FeedbackPanel} from './feedback/FeedbackPanel';

@HoistComponent()
export class ActivityTab extends Component {

    localModel = new TabContainerModel({
        route: 'default.activity',
        tabs: [
            {id: 'tracking', content: TrackingPanel},
            {id: 'clientErrors', content: ClientErrorPanel},
            {id: 'feedback', content: FeedbackPanel}
        ]
    });

    async loadAsync() {
        this.model.requestRefresh();
    }
    
    render() {
        return tabContainer({model: this.model, switcherPosition: 'left'});
    }
}
