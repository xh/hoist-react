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


@hoistComponent()
export class MonitorResultsPanel extends Component {
    localModel = new MonitorResultsModel();

    async loadAsync() {
        this.model.loadAsync();
    }

    render() {
        const model = this.model;
        return vframe(
            monitorResultsToolbar({model}),
            monitorResultsDisplay({model})
        );
    }
}