/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {tabContainer, TabContainerModel} from '@xh/hoist/desktop/cmp/tab';

import {MonitorResultsPanel} from './MonitorResultsPanel';
import {MonitorEditorPanel} from './MonitorEditorPanel';

@HoistComponent
export class MonitorTab extends Component {

    model = new TabContainerModel({
        route: 'default.monitor',
        tabs: [
            {id: 'status', content: MonitorResultsPanel},
            {id: 'editMonitors', content: MonitorEditorPanel}
        ]
    });

    async loadAsync() {
        this.model.requestRefresh();
    }
    
    render() {
        return tabContainer({model: this.model, switcherPosition: 'left'});
    }
}
