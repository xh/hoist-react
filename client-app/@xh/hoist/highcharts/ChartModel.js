/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, setter} from 'hoist/mobx';


/**
 * Model for HighChart.
 *
 * Manages configuration of a Highcharts chart.
 */
export class ChartModel {

    /**
     * Highchart config of chart.
     *
     * This may includes all native highcharts options other than 'series',
     * which should be set on the seperate 'series' property on this object.
     */
    @observable @setter config = {};


    /**
     * Data series to be displayed.
     */
    @observable @setter series = [];

    /**
     * Construct this object.
     */
    constructor({config, series = []} = {}) {
        this.setConfig(config);
        this.setSeries(series);
    }
}