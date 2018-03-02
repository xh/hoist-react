/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import moment from 'moment';
import {forOwn} from 'lodash';
import {button} from 'hoist/kit/blueprint';
import {XH, hoistComponent} from 'hoist/core';
import {grid, GridModel} from 'hoist/grid';
import {chart, ChartModel} from 'hoist/highcharts';
import {vframe, hbox, vbox} from 'hoist/layout';
import {collapsible} from 'hoist/cmp';
import {observer, observable, action, whyRun} from 'hoist/mobx';
import {numberRenderer} from 'hoist/format';

@hoistComponent()
export class VisitsChart extends Component {

}

export const visitsChart = elemFactory(VisitsChart);