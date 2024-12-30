/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, PlainObject, Some} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {castArray, cloneDeep} from 'lodash';
import {mergeDeep} from '@xh/hoist/utils/js';

interface ChartConfig {
    /** The initial highchartsConfig for this chart. */
    highchartsConfig: PlainObject;

    /** The initial data series to be displayed. */
    series?: Some<any>;

    /** True to showContextMenu.  Defaults to true.  Desktop only. */
    showContextMenu?: boolean;

    /** @internal */
    xhImpl?: boolean;
}

/**
 * Model to hold and maintain the configuration and data series for a Highcharts chart.
 */
export class ChartModel extends HoistModel {
    @observable.ref
    highchartsConfig: PlainObject = {};

    @observable.ref
    series: any[] = [];

    showContextMenu: boolean;

    /**
     * The HighCharts instance currently being displayed. This may be used for reading
     * information about the chart, but any mutations to the chart should
     * be done via {@link setHighchartsConfig} or {@link setSeries}.
     */
    @observable.ref
    highchart: any;

    constructor(config?: ChartConfig) {
        super();
        makeObservable(this);

        const {
            highchartsConfig,
            series = [],
            showContextMenu = true,
            xhImpl = false
        } = config ?? {};

        this.xhImpl = xhImpl;
        this.highchartsConfig = highchartsConfig;
        this.series = castArray(series);
        this.showContextMenu = showContextMenu;
    }

    /**
     *  Update the Highcharts instance configuration.
     *
     *  See also {@link updateHighchartsConfig} for a method that will allow updating individual
     *  properties in this object.
     *
     *  @param config - Highcharts configuration object. May include any Highcharts options other
     *      than `series`, which should be set via `setSeries()`.
     */
    @action
    setHighchartsConfig(config: any) {
        this.highchartsConfig = config;
    }

    /**
     * Merge new properties settings into the Highcharts configuration (Deep merge)
     *
     * @param update - Updates to Highcharts configuration settings.  May include any
     *      Highcharts options other than `series`, which should be set via `setSeries()`.
     */
    @action
    updateHighchartsConfig(update: any) {
        this.highchartsConfig = mergeDeep(cloneDeep(this.highchartsConfig), update);
    }

    /** @param series - one or more data series to be charted. */
    @action
    setSeries(series: any | any[]) {
        this.series = series ? castArray(series) : [];
    }

    /** Remove all series from this chart. */
    clear() {
        this.setSeries([]);
    }
}
