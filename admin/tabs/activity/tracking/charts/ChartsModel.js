/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {cloneDeep, reverse} from 'lodash';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {chart} from '@xh/hoist/cmp/chart';
import {fmtDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {TabContainerModel} from '@xh/hoist/cmp/tab';

@HoistModel
export class ChartsModel {

    @bindable.ref data;
    @bindable.ref dimensions;
    @bindable chartAllLogs = false;
    @bindable enableTimeseries = true;

    @managed
    tabContainerModel = new TabContainerModel({
        tabs: [
            {id: 'Histogram', icon: Icon.chartBar(), content: () => chart({model: this.categoryChartModel})},
            {id: 'Timeseries', icon: Icon.chartLine(), content: () => chart({model: this.timeSeriesChartModel})}
        ]
    })

    @managed
    timeSeriesChartModel = new ChartModel({
        highchartsConfig: {
            chart: {type: 'line'},
            plotOptions: {
                line: {animation: false}
            },
            title: {text: null},
            xAxis: {
                type: 'datetime',
                units: [['day', [1]], ['week', [2]], ['month', [1]]],
                labels: {
                    formatter: function() {return fmtDate(this.value, 'D MMM')}
                }
            },
            yAxis: [
                {
                    title: {
                        text: 'Count',
                        style: {
                            color: this.colors.featuredSeries
                        }
                    },
                    allowDecimals: false
                },
                {
                    title: {
                        text: 'Avg Elapsed (ms)',
                        style: {
                            color: this.colors.elapsedSeries
                        }
                    },
                    opposite: true
                }
            ]
        }
    });

    @managed
    categoryChartModel = new ChartModel({
        highchartsConfig: {
            chart: {type: 'column'},
            plotOptions: {
                column: {animation: false}
            },
            title: {text: null},
            xAxis: {
                type: 'category',
                title: {
                    text: 'Category'
                }
            },
            yAxis: [
                {
                    title: {
                        text: 'Count',
                        style: {
                            color: this.colors.featuredSeries
                        }
                    },
                    allowDecimals: false
                },
                {
                    title: {
                        text: 'Avg Elapsed (ms)',
                        style: {
                            color: this.colors.elapsedSeries
                        }
                    },
                    opposite: true,
                    color: this.colors.elapsedSeries
                }
            ]
        }
    });

    axisLabelMap = {
        username: 'Users',
        msg: 'Messages',
        category: 'Categories',
        device: 'Devices',
        browser: 'Browsers',
        userAgent: 'Agents',
        cubeDay: 'Days'
    };

    get xAxisLabel() {
        const dim = this.dimensions[0],
            label = this.axisLabelMap[dim];

        return this.chartAllLogs || !label ? 'Logs' : label;
    }

    get yAxisLabel() {
        const dim = this.dimensions[1],
            label = this.axisLabelMap[dim];

        return this.chartAllLogs || !label ? 'Logs' : label;
    }

    get colors() {
        return XH.darkTheme ? {featuredSeries: '#2b908f', elapsedSeries: '#90ee7e'} : {featuredSeries: '#7cb5ec', elapsedSeries: '#434348'};
    }

    constructor() {
        this.addReaction(this.enableTimeseriesReaction());
        this.addReaction(this.loadChartReaction());
        this.addReaction(this.themeReaction());
    }

    loadChart() {
        const isTimeseries = this.tabContainerModel.activeTabId == 'Timeseries',
            series = isTimeseries ? this.getTimeseriesData() : this.getCategoryData(),
            chartModel = isTimeseries ? this.timeSeriesChartModel : this.categoryChartModel,
            highchartsConfig = cloneDeep(chartModel.highchartsConfig);

        highchartsConfig.yAxis[0].title.text = `Unique ${this.yAxisLabel}`;
        if (!isTimeseries) highchartsConfig.xAxis.title.text = this.xAxisLabel;

        chartModel.setHighchartsConfig(highchartsConfig);
        chartModel.setSeries(series);
    }

    getTimeseriesData() {
        const {data} = this,
            counts = [],
            elapsed = [];

        data.forEach((it) => {
            const count = this.chartAllLogs ? it.logCount : it.count;
            counts.push([LocalDate.from(it.cubeLabel).timestamp, count]);
            elapsed.push([LocalDate.from(it.cubeLabel).timestamp, Math.round(it.elapsed)]);
        });

        return [{name: this.yAxisLabel, data: reverse(counts), yAxis: 0}, {name: 'Elapsed', data: reverse(elapsed), yAxis: 1}];
    }

    getCategoryData() {
        const {data} = this,
            counts = [],
            elapsed = [],
            yAxisDim = this.dimensions[0];

        data.forEach((it) => {
            const count = this.chartAllLogs ? it.logCount : it.count;
            counts.push([it[yAxisDim], count]);
            elapsed.push([it[yAxisDim], Math.round(it.elapsed)]);
        });

        // The cube will provide the data from latest to earliest, this causes rendering issues with the bar chart
        return [{name: `${this.yAxisLabel}`, data: reverse(counts), yAxis: 0}, {name: 'Elapsed', data: reverse(elapsed), yAxis: 1}];
    }

    ensureProperTimeseriesChartState(enable) {
        if (!enable) {
            this.tabContainerModel.setActiveTabId('Histogram');
        }

        this.tabContainerModel.tabs[1].setDisabled(!enable);
    }

    loadChartReaction() {
        return {
            track: () => [this.chartAllLogs, this.data, this.tabContainerModel.activeTabId],
            run: () => this.loadChart()
        };
    }

    enableTimeseriesReaction() {
        return {
            track: () => this.enableTimeseries,
            run: (enable) => this.ensureProperTimeseriesChartState(enable)
        };
    }

    themeReaction() {
        return {
            track: () => XH.darkTheme,
            run: () => {
                const {colors, categoryChartModel, timeSeriesChartModel} = this,
                    {featuredSeries, elapsedSeries} = colors,
                    catHchartConf = cloneDeep(categoryChartModel.highchartsConfig),
                    timeHchartConf = cloneDeep(timeSeriesChartModel.highchartsConfig);

                catHchartConf.yAxis[0].title.style.color = featuredSeries;
                catHchartConf.yAxis[1].title.style.color = elapsedSeries;
                timeHchartConf.yAxis[0].title.style.color = featuredSeries;
                timeHchartConf.yAxis[1].title.style.color = elapsedSeries;

                categoryChartModel.setHighchartsConfig(catHchartConf);
                timeSeriesChartModel.setHighchartsConfig(timeHchartConf);
            }
        };
    }

}