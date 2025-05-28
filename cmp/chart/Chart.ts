/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {isEmpty, isFunction} from 'lodash';
import {box, div} from '@xh/hoist/cmp/layout';
import {
    hoistCmp,
    HoistModel,
    HoistProps,
    LayoutProps,
    lookup,
    MenuItemLike,
    PlainObject,
    TestSupportProps,
    useLocalModel,
    uses,
    XH
} from '@xh/hoist/core';
import {ChartContextMenu} from '@xh/hoist/desktop/cmp/contextmenu/ChartContextMenu';
import {useContextMenu} from '@xh/hoist/dynamics/desktop';
import {Highcharts} from '@xh/hoist/kit/highcharts';
import {runInAction} from '@xh/hoist/mobx';
import {logError, mergeDeep} from '@xh/hoist/utils/js';
import {
    createObservableRef,
    getLayoutProps,
    useOnResize,
    useOnVisibleChange
} from '@xh/hoist/utils/react';
import {assign, castArray, cloneDeep, forOwn, isEqual, isPlainObject, omit} from 'lodash';
import {placeholder} from '../layout';
import './Chart.scss';
import {ChartModel} from './ChartModel';
import {installCopyToClipboard} from './impl/copyToClipboard';
import {installZoomoutGesture} from './impl/zoomout';
import {DarkTheme} from './theme/Dark';
import {LightTheme} from './theme/Light';

installZoomoutGesture(Highcharts);
installCopyToClipboard(Highcharts);

export interface ChartProps extends HoistProps<ChartModel>, LayoutProps, TestSupportProps {
    /**
     * Ratio of width-to-height of displayed chart.  If defined and greater than 0, the chart will
     * respect this ratio within the available space.  Otherwise, the chart will stretch on both
     * dimensions to take up all available space.
     */
    aspectRatio?: number;
}

/**
 * Wrapper Component for a Highcharts chart. Provides basic rendering / lifecycle management
 * as well as configuration and theme defaults. The chart's core configuration should be sourced
 * from a ChartModel prop passed to this component.
 */
export const [Chart, chart] = hoistCmp.withFactory<ChartProps>({
    displayName: 'Chart',
    model: uses(ChartModel),
    className: 'xh-chart',

    render({model, className, aspectRatio, testId, ...props}, ref) {
        if (!Highcharts) {
            logError(
                'Highcharts not imported by this app - import and register modules in Bootstrap.ts. See the XH Toolbox app for an example.',
                Chart
            );
            return placeholder('Highcharts library not available.');
        }

        const impl = useLocalModel(ChartLocalModel);
        ref = composeRefs(
            ref,
            useOnResize(impl.onResize),
            useOnVisibleChange(impl.onVisibleChange)
        );

        // Default flex = 1 (flex: 1 1 0) if no dimensions / flex specified, i.e. do not consult child for dimensions;
        const layoutProps = getLayoutProps(props);

        if (layoutProps.width == null && layoutProps.height == null && layoutProps.flex == null) {
            layoutProps.flex = 1;
        }

        // Inner div required to be the ref for the chart element
        const coreContents = box({
            ...layoutProps,
            className,
            testId,
            ref,
            item: div({
                style: {margin: 'auto'},
                ref: impl.chartRef
            })
        });

        return !XH.isMobileApp ? useContextMenu(coreContents, impl.contextMenu) : coreContents;
    }
});

class ChartLocalModel extends HoistModel {
    override xhImpl = true;

    @lookup(ChartModel)
    model: ChartModel;

    chartRef = createObservableRef<HTMLElement>();
    contextMenu: MenuItemLike[];
    prevSeriesConfig;

    override onLinked() {
        this.contextMenu = this.getContextMenu();

        this.addReaction({
            track: () => [
                this.componentProps.aspectRatio,
                this.chartRef.current,
                this.model.highchartsConfig,
                XH.darkTheme
            ],
            run: () => this.renderHighChart(),
            debounce: 0
        });
        this.addReaction({
            track: () => this.model.series,
            run: () => this.updateSeries()
        });
    }

    set chart(newChart) {
        runInAction(() => (this.model.highchart = newChart));
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
        // Chart does not re-render well in fullscreen mode
        // so just close fullscreen mode if it's open.
        if (this.chart?.fullscreen?.isOpen) {
            this.chart.fullscreen.close();
        }

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
            if (parentDims.width === 0 || parentDims.height === 0) return;

            const dims = this.getChartDims(parentDims);
            assign(config.chart, dims);

            config.chart.renderTo = chartElem;
            this.chart = Highcharts.chart(config);
        }
    }

    onResize = size => {
        if (!this.chart) return;
        const {width, height} = this.getChartDims(size);

        if (this.chart.fullscreen.isOpen) return;

        this.chart.setSize(width, height, false);
    };

    onVisibleChange = visible => {
        if (visible && !this.chart) {
            this.renderHighChart();
        }
    };

    getChartDims({width, height}) {
        const {aspectRatio} = this.componentProps;

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

    override destroy() {
        this.destroyHighChart();
        super.destroy();
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
    getMergedConfig(): PlainObject {
        const propsConf = this.getModelConfig(),
            themeConf = this.getThemeConfig(),
            defaultConf = this.getDefaultConfig();

        this.mergeAxisConfigs(themeConf, propsConf);
        return mergeDeep(defaultConf, themeConf, propsConf);
    }

    getDefaultConfig() {
        const exporting = {
            enabled: false,
            fallbackToExportServer: false,
            chartOptions: {
                scrollbar: {enabled: false},
                rangeSelector: {enabled: false},
                navigator: {enabled: false},
                xAxis: [{labels: {enabled: true}}],
                yAxis: [{labels: {enabled: true}}]
            },
            menuItemDefinitions: {
                copyToClipboard: {
                    onclick: function () {
                        this.copyToClipboardAsync();
                    },
                    text: 'Copy to clipboard'
                }
            },
            buttons: {
                contextButton: {
                    menuItems: [
                        'viewFullscreen',
                        'separator',
                        ...(Highcharts.isWebKit ? ['copyToClipboard'] : []),
                        'printChart',
                        'separator',
                        'downloadPNG',
                        'downloadSVG',
                        'downloadCSV'
                    ]
                }
            }
        };

        return {
            chart: {
                events: {
                    beforePrint: function () {
                        // When we print, we use the same options provided for exporting, which
                        // can be found at `exporting.chartOptions`
                        const config = cloneDeep(this.options),
                            printChartOptions = {
                                ...config.exporting?.chartOptions,
                                exporting: {enabled: false} // Hide the hamburger menu
                            };

                        // For each option we're going to change for printing, recursively copy the
                        // current settings so we can restore them later.
                        const copySettings = (src, ref) => {
                            const ret = {};
                            forOwn(ref, (v, key) => {
                                ret[key] = isPlainObject(v) ? copySettings(src[key], v) : src[key];
                            });
                            return ret;
                        };
                        this._screenChartOptions = copySettings(config, printChartOptions);

                        // Update the chart with print options
                        this.update(printChartOptions);
                    },
                    afterPrint: function () {
                        // Restore the original screen options
                        this.update(this._screenChartOptions);
                    }
                }
            },
            credits: false,
            title: {text: null},
            accessibility: {enabled: false},
            exporting
        };
    }

    mergeAxisConfigs(theme, conf) {
        const axisLabels = ['x', 'y', 'z'];
        axisLabels.forEach(lbl => {
            const axis = lbl + 'Axis',
                arr = castArray(conf[axis] || {}),
                defaultAxisConfig = this.getDefaultAxisConfig(axis);

            conf[axis] = arr.map(it => mergeDeep({}, defaultAxisConfig, theme[axis], it));
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
        return XH.darkTheme ? cloneDeep(DarkTheme) : cloneDeep(LightTheme);
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
    onSetExtremes = () => {};

    getContextMenu(): MenuItemLike[] {
        const {contextMenu} = this.model;
        if (!contextMenu || isEmpty(contextMenu) || !XH.isDesktop) return null;

        const items = isFunction(contextMenu) ? contextMenu(this.model) : contextMenu;

        return new ChartContextMenu({
            items,
            chartModel: this.model
        }).items;
    }
}
