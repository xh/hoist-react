/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {useEffect} from 'react';
import composeRefs from '@seznam/compose-react-refs';
import {box, div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useLocalModel, uses, XH} from '@xh/hoist/core';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {bindable, runInAction} from '@xh/hoist/mobx';
import {
    createObservableRef,
    getLayoutProps,
    useOnResize,
    useOnVisibleChange
} from '@xh/hoist/utils/react';
import {isNodeVisible} from '@xh/hoist/utils/js/';
import {assign, castArray, clone, isEqual, merge, omit} from 'lodash';
import PT from 'prop-types';
import {ChartModel} from './ChartModel';
import {installZoomoutGesture} from './impl/zoomout';
import {DarkTheme} from './theme/Dark';
import {LightTheme} from './theme/Light';

installZoomoutGesture(Highcharts);

/**
 * Wrapper Component for a Highcharts chart. Provides basic rendering / lifecycle management
 * as well as configuration and theme defaults. The chart's core configuration should be sourced
 * from a ChartModel prop passed to this component.
 */
export const [Chart, chart] = hoistCmp.withFactory({
    displayName: 'Chart',
    model: uses(ChartModel),
    className: 'xh-chart',

    render({model, className, aspectRatio, ...props}) {

        if (!Highcharts) {
            console.error(
                'Highcharts has not been imported in to this application. Please import and ' +
                'register in Bootstrap.js. See the XH Toolbox app for an example.'
            );
            return div({
                className: 'xh-text-color-accent xh-pad',
                item: 'Highcharts library not available.'
            });
        }

        const impl = useLocalModel(() => new LocalModel(model, aspectRatio)),
            ref = composeRefs(
                useOnResize(impl.onResize),
                useOnVisibleChange(impl.onVisibleChange)
            );

        useEffect(() => impl.setAspectRatio(aspectRatio), [impl, aspectRatio]);

        // Default flex = 1 (flex: 1 1 0) if no dimensions / flex specified, i.e. do not consult child for dimensions;
        const layoutProps = getLayoutProps(props);

        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 1;
        }

        // Inner div required to be the ref for the chart element
        return box({
            ...layoutProps,
            className,
            ref,
            item: div({
                style: {margin: 'auto'},
                ref: impl.chartRef
            })
        });
    }
});
Chart.propTypes = {
    /**
     * Ratio of width-to-height of displayed chart.  If defined and greater than 0, the chart will
     * respect this ratio within the available space.  Otherwise, the chart will stretch on both
     * dimensions to take up all available space.
     */
    aspectRatio: PT.number,

    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(ChartModel), PT.object])
};


@HoistModel
class LocalModel {
    @bindable aspectRatio;
    chartRef = createObservableRef();
    model;
    prevSeriesConfig;

    constructor(model, aspectRatio) {
        this.model = model;
        this.aspectRatio = aspectRatio;
        this.addReaction({
            track: () => [
                this.aspectRatio,
                this.chartRef.current,
                model.highchartsConfig,
                XH.darkTheme
            ],
            run: () => this.renderHighChart()
        });
        this.addReaction({
            track: () => model.series,
            run: () => this.updateSeries()
        });
    }

    set chart(newChart) {
        runInAction(() => this.model.highchart = newChart);
    }

    get chart() {
        return this.model.highchart;
    }

    updateSeries() {
        const newSeries = this.model.series,
            seriesConfig = newSeries.map(it => omit(it, 'data')),
            {prevSeriesConfig, chart} = this,
            sameConfig = chart && isEqual(seriesConfig, prevSeriesConfig),
            sameSeriesCount = chart && prevSeriesConfig?.length === seriesConfig.length;

        // If metadata not changed or # of series the same we can do more minimal in-place updates
        if (sameConfig) {
            newSeries.forEach((s, i) => chart.series[i].setData(s.data, false));
            chart.redraw();
        } else if (sameSeriesCount) {
            newSeries.forEach((s, i) => chart.series[i].update(s, false));
            chart.redraw();
        } else {
            this.renderHighChart();
        }
        this.prevSeriesConfig = seriesConfig;
    }

    renderHighChart() {
        this.destroyHighChart();
        const chartElem = this.chartRef.current;
        if (chartElem) {
            const config = this.getMergedConfig(),
                parentEl = chartElem.parentElement,
                parentDims = {
                    width: parentEl.offsetWidth,
                    height: parentEl.offsetHeight
                };

            // Skip creating HighCharts instance if hidden - we will
            // instead create when it becomes visible
            if (!isNodeVisible(parentEl)) return;

            const dims = this.getChartDims(parentDims);
            assign(config.chart, dims);

            config.chart.renderTo = chartElem;
            this.chart = Highcharts.chart(config);
        }
    }

    onResize = (size) => {
        if (!this.chart) return;
        const {width, height} = this.getChartDims(size);
        this.chart.setSize(width, height, false);
    };

    onVisibleChange = (visible) => {
        if (visible && !this.chart) {
            this.renderHighChart();
        }
    };

    getChartDims({width, height}) {
        const {aspectRatio} = this;

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
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
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
                // Padding is ignored by setExtremes, so we default to 0 to make things less jumpy when zooming.
                // This is especially important when Navigator shown; first reload of data can cause a surprising tiny rezoom.
                minPadding: 0,
                maxPadding: 0,
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
            ...this.model.highchartsConfig,
            series: this.model.series
        };
    }

    //---------------------------
    // Handlers
    //---------------------------
    onSetExtremes = () => {

    }
}
