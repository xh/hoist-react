/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent, managed} from '@xh/hoist/core';
import {vframe} from '@xh/hoist/cmp/layout';

import {activityGrid} from './ActivityGrid';
import {ActivityGridModel} from './ActivityGridModel';
import {visitsChart} from './VisitsChart';
import {VisitsChartModel} from './VisitsChartModel';

@HoistComponent
export class TrackingPanel extends Component {

    @managed
    activityGridModel = new ActivityGridModel();

    @managed
    visitsChartModel = new VisitsChartModel();

    render() {
        return vframe(
            activityGrid({model: this.activityGridModel}),
            visitsChart({model: this.visitsChartModel})
        );
    }
}
