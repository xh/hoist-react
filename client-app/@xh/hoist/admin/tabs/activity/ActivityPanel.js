/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, hoistComponent} from 'hoist/core';
import {grid, GridModel} from 'hoist/grid';
import {UrlStore} from 'hoist/data';
import {chart, ChartModel} from 'hoist/highcharts';
import {vframe} from 'hoist/layout';
import {collapsible} from 'hoist/cmp';
import {numberRenderer} from 'hoist/format';
import {baseCol} from 'hoist/columns/Core';
import {dateTimeCol} from 'hoist/columns/DatesTimes';

import {usernameCol} from '../../columns/Columns';
import {activityGridToolbar} from './ActivityGridToolbar';
import {ActivityModel} from './ActivityModel';
import {visitsChart} from './VisitsChart';
import {VisitsModel} from './VisitsModel';

@hoistComponent()
export class ActivityPanel extends Component {

    activityModel = new ActivityModel();
    visitsModel = new VisitsModel();

    render() {
        return vframe(
            activityGridToolbar({model: this.activityModel}),
            grid({model: this.gridModel}),
            collapsible({
                side: 'bottom',
                contentSize: 250,
                item: visitsChart({model: this.visitsModel})
            })
        );
    }

    async loadAsync() {
        return Promise.all([this.visitsModel.loadAsync(), this.store.loadAsync()]).then(() => {
            this.activityModel.setFilter()
        });
    }
}
