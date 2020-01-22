/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';

/**
 * Model to hold and maintain the configuration and data series for a Highcharts chart.
 */
@HoistModel
export class ChartModel {

    @bindable.ref highchartsConfig = {};
    @bindable.ref series = [];
    hchart;

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

}