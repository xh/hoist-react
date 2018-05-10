/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent} from 'hoist/core';
import {vframe} from 'hoist/layout';
import {monitorResultsToolbar} from './MonitorResultsToolbar';
import {monitorResultsDisplay} from './MonitorResultsDisplay';
import {MonitorResultsModel} from './MonitorResultsModel';
import './MonitorResultsPanel.scss';


@hoistComponent()
export class MonitorResultsPanel extends Component {
    localModel = new MonitorResultsModel(this.props.tabPaneModel);

    async loadAsync() {
        this.model.loadAsync();
    }

    render() {
        const {model} = this;

        return vframe({
            cls: 'xh-monitor-results-panel',
            items: [
                monitorResultsToolbar({model}),
                monitorResultsDisplay({model})
            ]
        });
    }
}