/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {XH, hoistComponent, elemFactory} from 'hoist/core';
import {frame, div} from 'hoist/layout';
import {toJS} from 'hoist/mobx';
import {asArray} from 'hoist/utils/JsUtils';
import {Ref} from 'hoist/utils/Ref';
import Highcharts from 'highcharts/highstock';
import {merge, clone} from 'lodash';


import {LightTheme} from './theme/Light';
import {DarkTheme} from './theme/Dark';

/**
 * Wrapper Component for Highcharts chart.
 */
@hoistComponent()
export class Chart extends Component {

    _chartElem = new Ref();
    _chart = null;

    render() {
        this.renderHighChart();
        return frame({
            ...this.props,
            item: div({
                style: {flex: 'auto', overflow: 'hidden'},
                ref: this._chartElem.ref
            })
        });
    }

    //-------------------
    // Implementation
    //-------------------
    componentWillUnmount() {
        this.destroyHighChart();
    }

    renderHighChart() {
        this.destroyHighChart();
        const chartElem = this._chartElem.value;
        if (chartElem) {
            const config = this.getMergedConfig();
            config.chart.renderTo = chartElem;
            this._chart = Highcharts.chart(config);
        }
    }

    destroyHighChart() {
        if (this._chart) {
            this._chart.destroy();
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
                arr = asArray(conf[axis] || {}),
                dfltAxisConfig = this.getDefaultAxisConfig(axis);

            conf[axis] = arr.map(it => merge({}, dfltAxisConfig, theme[axis], it));
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
        return this.darkTheme ? clone(DarkTheme) : clone(LightTheme);
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