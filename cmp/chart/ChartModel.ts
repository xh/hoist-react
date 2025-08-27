/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {type MouseEvent} from 'react';
import type {ChartContextMenuSpec, ChartMenuToken} from '@xh/hoist/cmp/chart/Types';
import {getContextMenuItems} from '@xh/hoist/cmp/chart/impl/ChartContextMenuItems';
import {HoistModel, PlainObject, Some, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {castArray, cloneDeep, isFunction, isNil} from 'lodash';
import {mergeDeep} from '@xh/hoist/utils/js';

interface ChartConfig {
    /** The initial highchartsConfig for this chart. */
    highchartsConfig: PlainObject;

    /** The initial data series to be displayed. */
    series?: Some<any>;

    /**
     * True (default) to show default ContextMenu. Supported on desktop only.
     */
    contextMenu?: ChartContextMenuSpec;

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

    contextMenu: ChartContextMenuSpec;

    static defaultContextMenu: ChartMenuToken[] = [
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
     * be done via {@link setHighchartsConfig} or {@link setSeries}.
     */
    @observable.ref
    highchart: any;

    constructor(config?: ChartConfig) {
        super();
        makeObservable(this);

        const {highchartsConfig, series = [], contextMenu, xhImpl = false} = config ?? {};

        this.xhImpl = xhImpl;
        this.highchartsConfig = highchartsConfig;
        this.series = castArray(series);
        this.contextMenu = this.parseContextMenu(contextMenu);
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

    private parseContextMenu(spec: ChartContextMenuSpec): ChartContextMenuSpec {
        if (spec === false || !XH.isDesktop) return null;
        if (isNil(spec) || spec === true) spec = ChartModel.defaultContextMenu;

        return (e: MouseEvent | PointerEvent) => {
            // Convert hoverpoints to points for use in actionFn.
            // Hoverpoints are transient, and change/disappear as mouse moves.
            const getPoint = pt => pt.series?.points.find(it => it.index === pt.index);
            const {hoverPoint, hoverPoints} = this.highchart,
                context = {
                    contextMenuEvent: e,
                    chartModel: this,
                    point: hoverPoint ? getPoint(hoverPoint) : null,
                    points: hoverPoints ? hoverPoints.map(getPoint) : []
                },
                items = isFunction(spec) ? spec(e, context) : spec;

            return getContextMenuItems(items, context);
        };
    }
}
