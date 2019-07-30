/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';


/**
 * Model to hold and maintain the configuration and data series for a Highcharts chart.
 */
@HoistModel
export class ChartModel {

    @bindable.ref highchartsConfig = {};
    @bindable.ref series = [];

    /**
     * @param {Object} c - ChartModel configuration.
     * @param {Object} c.highchartsConfig - Highcharts configuration object for the managed chart. May include
     *      any Highcharts opts other than `series`, which should be set via dedicated config.
     * @param {Object[]} c.series - Data series to be displayed.
     */
    constructor({highchartsConfig, series = [], config} = {}) {
        // Deprecation warning to avoid breaking change
        if (config) {
            console.warn('ChartModel "config" has been deprecated. Please use "highchartsConfig" instead.');
            highchartsConfig = config;
        }

        this.highchartsConfig = highchartsConfig;
        this.series = series;
    }
}
