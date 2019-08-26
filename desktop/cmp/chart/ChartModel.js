/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Model to hold and maintain the configuration and data series for a Highcharts chart.
 */
@HoistModel
export class ChartModel {

    @bindable.ref highchartsConfig = {};
    @bindable.ref series = [];

    /**
     * Instance of the actual Highcharts Chart object, if instantiated and rendered.
     *
     * Developers are strongly discouraged from saving a reference to this chart instance or calling
     * methods on it to modify its state, as it can be destroyed and recreated at any time to
     * respond to changes in this model's state.
     */
    @observable.ref highchartsChart;

    /**
     * @param {Object} c - ChartModel configuration.
     * @param {Object} c.highchartsConfig - Highcharts configuration object for the managed chart. May include
     *      any Highcharts opts other than `series`, which should be set via dedicated config.
     * @param {Object[]} c.series - Data series to be displayed.
     */
    constructor({highchartsConfig, series = [], config} = {}) {
        throwIf(config, 'ChartModel "config" has been removed. Please use "highchartsConfig" instead.');
        this.highchartsConfig = highchartsConfig;
        this.series = series;
    }

    //------------------------
    // Implementation
    //------------------------
    // Called by Chart component when chart instance rendered to the DOM. Not for application use.
    @action
    setHighchartsChart(chartInstance) {
        this.highchartsChart = chartInstance;
    }

}