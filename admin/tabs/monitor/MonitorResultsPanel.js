/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';

import {monitorResultsToolbar} from './MonitorResultsToolbar';
import {monitorResultsDisplay} from './MonitorResultsDisplay';
import {MonitorResultsModel} from './MonitorResultsModel';

import './MonitorResultsPanel.scss';


@HoistComponent
export class MonitorResultsPanel extends Component {

    model = new MonitorResultsModel({view: this});

    render() {
        const {model} = this;

        return panel({
            mask: model.loadModel,
            className: 'xh-monitor-results-panel',
            tbar: monitorResultsToolbar({model}),
            item: monitorResultsDisplay({model})
        });
    }
}