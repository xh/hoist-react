/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from 'hoist/core';
import {hbox} from 'hoist/cmp/layout';
import {tile} from './Tile';

@HoistComponent()
class MonitorResultsDisplay extends Component {
    render() {
        const {results} = this.model;

        return hbox({
            cls: 'xh-monitor-status-display',
            items: results.map((check, idx) => tile({
                key: `tile-${idx}`,
                check
            }))
        });
    }
}

export const monitorResultsDisplay = elemFactory(MonitorResultsDisplay);