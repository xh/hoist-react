/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from 'hoist/core';
import {monitorResultsToolbar} from './MonitorResultsToolbar';
import {monitorResultsDisplay} from './MonitorResultsDisplay';
import {MonitorResultsModel} from './MonitorResultsModel';
import {panel} from 'hoist/cmp';
import './MonitorResultsPanel.scss';


@HoistComponent()
export class MonitorResultsPanel extends Component {
    localModel = new MonitorResultsModel(this.props.tabPaneModel);

    async loadAsync() {
        this.model.loadAsync();
    }

    render() {
        const {model} = this;

        return panel({
            cls: 'xh-monitor-results-panel',
            topToolbar: monitorResultsToolbar({model}),
            item: monitorResultsDisplay({model})
        });
    }
}