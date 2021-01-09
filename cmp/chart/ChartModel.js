/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {castArray} from 'lodash';

/**
 * Model to hold and maintain the configuration and data series for a Highcharts chart.
 */
@HoistModel
export class ChartModel {

    @observable.ref highchartsConfig = {};
    @observable.ref series = [];

    /**
     * The HighCharts instance currently being displayed. This may be used for reading
     * information about the chart, but any mutations to the chart should
     * be done via {@see ChartModel.setHighchartsConfig} or {@see ChartModel.setSeries}.
     */
    @observable.ref highchart;

    /**
     * @param {Object} c - ChartModel configuration.
     * @param {Object} c.highchartsConfig - The initial highchartsConfig for this chart.
     * @param {(Object|Object[])} c.series - The initial data series to be displayed.
     */
    constructor({highchartsConfig, series = [], config} = {}) {
        throwIf(config, 'ChartModel "config" has been removed. Please use "highchartsConfig" instead.');
        this.highchartsConfig = highchartsConfig;
        this.series = castArray(series);
    }

    /**
     * @param {Object} config - Highcharts configuration object for the managed chart. May include any
     *      Highcharts opts other than `series`, which should be set via `setSeries()`.
     */
    @action
    setHighchartsConfig(config) {
        this.highchartsConfig = config;
    }

    /** @param {(Object|Object[])} series - one or more data series to be charted. */
    @action
    setSeries(series) {
        this.series = series ? castArray(series) : [];
    }

    /** Remove all series from this chart. */
    clear() {this.setSeries([])}

}
