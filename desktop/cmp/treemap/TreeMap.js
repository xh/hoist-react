/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {Highcharts, highchartsExporting, highchartsOfflineExporting, highchartsExportData, highchartsTree, highchartsHeatmap} from '@xh/hoist/kit/highcharts';

import {XH, elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {div, box} from '@xh/hoist/cmp/layout';
import {Ref} from '@xh/hoist/utils/react';
import {resizeSensor} from '@xh/hoist/kit/blueprint';
import {assign, merge} from 'lodash';

import {TreeMapModel} from './TreeMapModel';

highchartsExporting(Highcharts);
highchartsOfflineExporting(Highcharts);
highchartsExportData(Highcharts);
highchartsTree(Highcharts);
highchartsHeatmap(Highcharts);

/**
 * Todo
 */
@HoistComponent
@LayoutSupport
export class TreeMap extends Component {

    static propTypes = {
        /** Primary component model instance. */
        model: PT.oneOfType([PT.instanceOf(TreeMapModel), PT.object]).isRequired
    };

    static modelClass = TreeMapModel;

    baseClassName = 'xh-tree-map';

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

            assign(config.chart, {
                width: parentEl.offsetWidth,
                height: parentEl.offsetHeight
            });

            config.chart.renderTo = chartElem;
            this._chart = Highcharts.chart(config);
        }
    }

    resizeChart(e) {
        const {width, height} = e[0].contentRect;
        this._chart.setSize(width, height, false);
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
        const defaultConf = this.getDefaultConfig(),
            propsConf = this.getModelConfig();

        const ret = merge(defaultConf, propsConf);
        console.log(ret);
        return ret;
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
            title: false,
            exporting
        };
    }

    getModelConfig() {
        return {
            ...this.model.config,
            series: [{
                type: 'treemap',
                layoutAlgorithm: 'squarified',
                alternateStartingDirection: true,
                levels: [{
                    level: 1,
                    layoutAlgorithm: 'squarified',
                    dataLabels: {
                        enabled: true,
                        align: 'left',
                        verticalAlign: 'top',
                        style: {
                            fontSize: '15px',
                            fontWeight: 'bold'
                        }
                    }
                }],
                data: this.model.data
            }]
        };
    }
}

export const treeMap = elemFactory(TreeMap);