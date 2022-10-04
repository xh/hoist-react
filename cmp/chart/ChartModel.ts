/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {castArray, cloneDeep, merge} from 'lodash';

/**
 * Model to hold and maintain the configuration and data series for a Highcharts chart.
 */
export class ChartModel extends HoistModel {

    @observable.ref highchartsConfig = {};
    @observable.ref series = [];

    showContextMenu: boolean;

    /**
     * The HighCharts instance currently being displayed. This may be used for reading
     * information about the chart, but any mutations to the chart should
     * be done via {@see ChartModel.setHighchartsConfig} or {@see ChartModel.setSeries}.
     */
    @observable.ref highchart;

    /**
     * @param highchartsConfig - The initial highchartsConfig for this chart.
     * @param series - The initial data series to be displayed.
     * @param showContextMenu - true to showContextMenu.  Defaults to true.  Desktop only.
     */
    constructor(
        {highchartsConfig, series = [], showContextMenu = true}:
        {highchartsConfig?: any, series?: any|any[], showContextMenu?: boolean} = {}
    ) {
        super();
        makeObservable(this);
        this.highchartsConfig = highchartsConfig;
        this.series = castArray(series);
        this.showContextMenu = showContextMenu;
    }

    /**
     * Set the Highcharts configuration.
     *
     * @param config - Highcharts configuration object. May include any
     *      Highcharts options other than `series`, which should be set via `setSeries()`.
     *
     *  See also {@see updateHighChartsConfig} for a method that will allow updating individual
     *  properties in this object.
     */
    @action
    setHighchartsConfig(config: any) {
        this.highchartsConfig = config;
    }


    /**
     *  Merge new properties settings into the Highcharts configuration (Deep merge)
     *
     * @param update - Updates to Highcharts configuration settings.  May include any
     *      Highcharts options other than `series`, which should be set via `setSeries()`.
     */
    @action
    updateHighchartsConfig(update: any) {
        this.highchartsConfig = merge(cloneDeep(this.highchartsConfig), update);
    }

    /** @param series - one or more data series to be charted. */
    @action
    setSeries(series: any|any[]) {
        this.series = series ? castArray(series) : [];
    }

    /** Remove all series from this chart. */
    clear() {this.setSeries([])}

}
