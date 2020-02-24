/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Model to hold and maintain the configuration and data series for a Highcharts chart.
 */
@HoistModel
export class ChartModel {

    /**
     * Highcharts configuration object for the managed chart. May include
     * any Highcharts opts other than `series`, which should be set via dedicated config.
     */
    @bindable.ref highchartsConfig = {};
    
    /**
     * Data series to be displayed.
     */
    @bindable.ref series = [];

    /**
     * The HighCharts instance currently being displayed. This may be used for reading
     * information about the chart, but any mutations to the chart should
     * be done with ChartModel.setHighchartsConfig() or ChartModel.setSeries().
     */
    @observable.ref highchart;

    /**
     * @param {Object} c - ChartModel configuration.
     * @param {Object} c.highchartsConfig - The initial highchartsConfig for this chart.
     * @param {Object[]} c.series - The initial data series to be displayed.
     */
    constructor({highchartsConfig, series = [], config} = {}) {
        throwIf(config, 'ChartModel "config" has been removed. Please use "highchartsConfig" instead.');
        this.highchartsConfig = highchartsConfig;
        this.series = series;
    }

}