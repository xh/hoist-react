/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, HoistComponent} from 'hoist/core';
import {vframe, resizable} from 'hoist/cmp/layout';

import {activityGrid} from './ActivityGrid';
import {ActivityGridModel} from './ActivityGridModel';
import {visitsChart} from './VisitsChart';
import {VisitsChartModel} from './VisitsChartModel';

@HoistComponent()
export class ActivityPanel extends Component {

    activityGridModel = new ActivityGridModel();
    visitsChartModel = new VisitsChartModel();

    render() {
        return vframe(
            activityGrid({model: this.activityGridModel}),
            resizable({
                side: 'top',
                contentSize: 300,
                prefName: 'xhAdminActivityChartSize',
                item: visitsChart({model: this.visitsChartModel})
            })
        );
    }

    async loadAsync() {
        return Promise.all([this.visitsChartModel.loadAsync(), this.activityGridModel.loadAsync()]);
    }

    destroy() {
        XH.safeDestroy(this.activityGridModel, this.visitsChartModel);
    }
}
