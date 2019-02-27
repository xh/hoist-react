/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {HoistComponent} from '@xh/hoist/core';
import {vframe} from '@xh/hoist/cmp/layout';

import {activityGrid} from './ActivityGrid';
import {visitsChart} from './VisitsChart';

@HoistComponent
export class TrackingPanel extends Component {

    render() {
        return vframe(
            activityGrid(),
            visitsChart()
        );
    }
}
