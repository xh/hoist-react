/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {assign, castArray, clone, merge} from 'lodash';
import Highcharts from 'highcharts/highstock';
import highchartsExporting from 'highcharts/modules/exporting';
import highchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import highchartsExportData from 'highcharts/modules/export-data';

import { XH, elemFactory, HoistComponent, LayoutSupport } from '@xh/hoist/core';
import { div, box } from '@xh/hoist/cmp/layout';
import { Ref } from '@xh/hoist/utils/react';
import { resizeSensor } from '@xh/hoist/kit/blueprint';

import {LightTheme} from './theme/Light';
import {DarkTheme} from './theme/Dark';

import {ChartModel} from './ChartModel';
import {installZoomoutGesture} from './impl/zoomout';

highchartsExporting(Highcharts);
highchartsOfflineExporting(Highcharts);
highchartsExportData(Highcharts);
installZoomoutGesture(Highcharts);

/**
 * Wrapper Component for a Highcharts chart. Provides basic rendering / lifecycle management
 * as well as configuration and theme defaults. The chart's core configuration should be sourced
 * from a ChartModel prop passed to this component.
 */
@HoistComponent
@LayoutSupport
export class Chart extends Component {

    static propTypes = {
        /**
         * Ratio of width-to-height of displayed chart.  If defined and greater than 0, the chart will
         * respect this ratio within the available space.  Otherwise, the chart will stretch on both
         * dimensions to take up all available space.
         */
        aspectRatio: PT.number,

        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(ChartModel), PT.object]).isRequired
    };
    
    static modelClass = ChartModel;

    baseClassName = 'xh-chart';

    _chartElem = new Ref();
    _chart = null;

    render() {
        // Default flex = 1 (flex: 1 1 0) if no dimensions / flex specified, i.e. do not consult child for dimensions;
        const layoutProps = this.getLayoutProps();

        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 1;
        }

        this.renderHighChart();

        // Inner div required to be the ref for the chart element
        return resizeSensor({
            onResize: (e) => this.resizeChart(e),
            item: box({
                ...layoutProps,
                className: this.getClassName(),
                item: div({
                    style: {margin: 'auto'},
                    ref: this._chartElem.ref
                })
            })
        });
    }

    //-------------------
    // Implementation
    //-------------------
    renderHighChart() {
        this.destroyHighChart();
        const chartElem = this._chartElem.value;
        if (chartElem) {
            const config = this.getMergedConfig(),
                parentEl = chartElem.parentElement;

            assign(config.chart, this.getChartDims({
                width: parentEl.offsetWidth,
                height: parentEl.offsetHeight
            }));

            config.chart.renderTo = chartElem;
            this._chart = Highcharts.chart(config);
        }
    }

    resizeChart(e) {
        const {width, height} = this.getChartDims(e[0].contentRect);
        this._chart.setSize(width, height, false);
    }

    getChartDims({width, height}) {
        const {aspectRatio} = this.props;

        if (!aspectRatio || aspectRatio <= 0) return {width, height};

        return this.applyAspectRatio(width, height, aspectRatio);
    }

    applyAspectRatio(width, height, aspectRatio) {
        const adjWidth = height * aspectRatio,
            adjHeight = width / aspectRatio;

        if (aspectRatio >= 1) {
            // landscape
            if (width >= height && adjWidth <= width) {
                width = adjWidth;
            } else {
                height = adjHeight;
            }
        } else {
            // portrait
            if (height >= width && adjHeight <= height) {
                height = adjHeight;
            } else {
                width = adjWidth;
            }
        }

        return {width, height};
    }

    destroy() {
        this.destroyHighChart();
    }
    
    destroyHighChart() {
        XH.safeDestroy(this._chart);
        this._chart = null;
    }

    //----------------------
    // Highcharts Config
    //----------------------
    getMergedConfig() {
        const propsConf = this.getModelConfig(),
            themeConf = this.getThemeConfig(),
            defaultConf = this.getDefaultConfig();

        this.mergeAxisConfigs(themeConf, propsConf);
        return merge(defaultConf, themeConf, propsConf);
    }

    getDefaultConfig() {
        const exporting = {
            enabled: false,
            fallbackToExportServer: false,
            chartOptions: {
                scrollbar: {enabled: false}
            },
            buttons: {
                contextButton: {
                    menuItems: ['downloadPNG', 'downloadSVG', 'separator', 'downloadCSV']
                }
            }
        };

        return {
            chart: {},
            credits: false,
            exporting
        };
    }

    mergeAxisConfigs(theme, conf) {
        const axisLabels = ['x', 'y', 'z'];
        axisLabels.forEach(lbl => {
            const axis = lbl + 'Axis',
                arr = castArray(conf[axis] || {}),
                defaultAxisConfig = this.getDefaultAxisConfig(axis);

            conf[axis] = arr.map(it => merge({}, defaultAxisConfig, theme[axis], it));
            theme[axis] = null;
        });
    }

    getDefaultAxisConfig(axis) {
        const defaults = {
            xAxis: {
                dateTimeLabelFormats: {
                    day: '%e-%b-%y',
                    week: '%e-%b-%y',
                    month: '%b-%y',
                    year: '%Y'
                },
                events: {
                    setExtremes: this.onSetExtremes
                }
            },
            yAxis: {},
            zAxis: {}
        };

        return defaults[axis];
    }

    getThemeConfig() {
        return XH.darkTheme ? clone(DarkTheme) : clone(LightTheme);
    }

    getModelConfig() {
        return {
            ...this.model.config,
            series: this.model.series
        };
    }

    //---------------------------
    // Handlers
    //---------------------------
    onSetExtremes = () => {

    }
}
export const chart = elemFactory(Chart);