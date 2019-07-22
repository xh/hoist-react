/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';

/**
 * Todo
 */
@HoistModel
export class TreeMapModel {

    @bindable.ref config = {};
    @bindable.ref data = [];

    /**
     * @param {Object} c - ChartModel configuration.
     * @param {Object} c.config - Highcharts configuration object for the managed chart. May include
     *      any Highcharts opts other than `series`, which should be set via dedicated config.
     * @param {Object[]} c.data - Data to be displayed.
     */
    constructor({config, data = []} = {}) {
        this.config = config;
        this.data = data;
    }
}