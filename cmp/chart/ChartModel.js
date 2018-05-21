/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {observable, setter} from '@xh/hoist/mobx';


/**
 * Model to hold and maintain the configuration and data series for a Highcharts chart.
 */
@HoistModel()
export class ChartModel {

    @observable.ref @setter config = {};
    @observable.ref @setter series = [];

    /**
     * @param opts
     * @param {Object} opts.config - Highcharts configuration object for the managed chart.
     *      This may includes all native highcharts options other than 'series',
     *      which should be set on the separate 'series' property on this object.
     * @param {Array} opts.series - Data series to be displayed.
     */
    constructor({config, series = []} = {}) {
        this.setConfig(config);
        this.setSeries(series);
    }
}
