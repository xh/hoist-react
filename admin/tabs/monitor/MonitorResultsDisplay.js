/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {hbox} from '@xh/hoist/cmp/layout';
import {tile} from './Tile';
import {MonitorResultsModel} from './MonitorResultsModel';

/**
 * @private
 */
@HoistComponent
export class MonitorResultsDisplay extends Component {

    modelClass = MonitorResultsModel;

    static propTypes = {
        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(MonitorResultsModel), PT.object]).isRequired
    };

    render() {
        return hbox({
            className: 'xh-monitor-status-display',
            items: this.model.results.map((check, idx) => tile({
                key: `tile-${idx}`,
                check
            }))
        });
    }
}

export const monitorResultsDisplay = elemFactory(MonitorResultsDisplay);