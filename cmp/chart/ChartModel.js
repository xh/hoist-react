/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {castArray, cloneDeep, isEmpty, isFunction, isUndefined, merge} from 'lodash';

/**
 * Model to hold and maintain the configuration and data series for a Highcharts chart.
 */
export class ChartModel extends HoistModel {

    @observable.ref highchartsConfig = {};
    @observable.ref series = [];

    /** @member {(Array|function|boolean)} */
    contextMenu;

    static defaultContextMenu = [
        'viewFullscreen',
        '-', 
        'copyToClipboard',
        'printChart',
        '-',
        'downloadPNG', 
        'downloadSVG', 
        'downloadCSV'
    ];

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
     * @param {(array|function)} [c.contextMenu] - array of ContextMenuItems, ContextMenuItem configs or
     *      Highcharts token strings with which to create chart context menu items.  May also be specified as a
     *      function returning an array of ContextMenuItem. Desktop only.
     */
    constructor({
        highchartsConfig, 
        series = [], 
        contextMenu,
        config
    } = {}
    ) {
        super();
        makeObservable(this);
        throwIf(config, 'ChartModel "config" has been removed. Please use "highchartsConfig" instead.');
        this.highchartsConfig = highchartsConfig;
        this.series = castArray(series);

        this.contextMenu = isUndefined(contextMenu) || contextMenu === true ?
            ChartModel.defaultContextMenu : 
            isFunction(contextMenu) ? contextMenu(this) :
                isEmpty(contextMenu) ? [] :
                    contextMenu;
    }

    /**
     * Set the Highcharts configuration.
     *
     * @param {Object} config - Highcharts configuration object. May include any
     *      Highcharts options other than `series`, which should be set via `setSeries()`.
     *
     *  See also {@see updateHighChartsConfig} for a method that will allow updating individual
     *  properties in this object.
     */
    @action
    setHighchartsConfig(config) {
        this.highchartsConfig = config;
    }


    /**
     *  Merge new properties settings into the Highcharts configuration (Deep merge)
     *
     * @param {Object} update - Updates to Highcharts configuration settings.  May include any
     *      Highcharts options other than `series`, which should be set via `setSeries()`.
     */
    @action
    updateHighchartsConfig(update) {
        this.highchartsConfig = merge(cloneDeep(this.highchartsConfig), update);
    }

    /** @param {(Object|Object[])} series - one or more data series to be charted. */
    @action
    setSeries(series) {
        this.series = series ? castArray(series) : [];
    }

    /** Remove all series from this chart. */
    clear() {this.setSeries([])}

}
