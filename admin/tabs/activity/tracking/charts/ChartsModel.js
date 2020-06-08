/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {cloneDeep, sortBy} from 'lodash';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {fmtDate} from '@xh/hoist/format';

@HoistModel
export class ChartsModel {

    @bindable.ref data;
    @bindable.ref dimensions;
    @bindable.ref chartType = 'category';

    @bindable showFeatureSeries = true;
    @bindable showEntriesSeries = false;
    @bindable showElapsedSeries = true;
    @bindable enableTimeseries = true;

    @managed
    categoryChartModel = new ChartModel({
        highchartsConfig: {
            chart: {
                type: 'column',
                animation: false
            },
            legend: {
                enabled: false
            },
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
                        text: 'Entries',
                        style: {
                            color: this.colors.entriesSeries
                        }
                    },
                    allowDecimals: false
                },
                {
                    title: {
                        text: 'Avg Elapsed (ms)',
                        style: {
                            color: XH.darkTheme ? '#FFF' : this.colors.elapsedSeries
                        }
                    },
                    opposite: true
                }
            ]
        }
    });

    @managed
    timeseriesChartModel = new ChartModel({
        highchartsConfig: {
            chart: {
                type: 'line',
                animation: false
            },
            legend: {
                enabled: false
            },
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
                        text: 'Entries',
                        style: {
                            color: this.colors.entriesSeries
                        }
                    },
                    allowDecimals: false
                },
                {
                    title: {
                        text: 'Avg Elapsed (ms)',
                        style: {
                            color: XH.darkTheme ? '#FFF' : this.colors.elapsedSeries
                        }
                    },
                    opposite: true
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
        day: 'Days'
    };

    get xAxisLabel() {
        const dim = this.dimensions[0],
            label = this.axisLabelMap[dim];
        if (label == 'Days') return '';

        return label || 'Entries';
    }

    get yAxisLabel() {
        const dim = this.dimensions[1],
            label = this.axisLabelMap[dim];

        return label || 'Entries';
    }

    get colors() {
        return {featuredSeries: '#7cb5ec', entriesSeries: '#90ed7d', elapsedSeries: '#434348'};
    }

    constructor() {
        this.addReaction(this.enableTimeseriesReaction());
        this.addReaction(this.loadChartReaction());
        this.addReaction(this.themeReaction());
    }

    loadChart() {
        const isTimeseries = this.chartType == 'timeseries',
            series = isTimeseries ? this.getTimeseriesData() : this.getCategoryData(),
            chartModel = isTimeseries ? this.timeseriesChartModel : this.categoryChartModel,
            highchartsConfig = cloneDeep(chartModel.highchartsConfig);

        highchartsConfig.yAxis[0].title.text = `Unique ${this.yAxisLabel}`;
        highchartsConfig.yAxis[0].visible = this.showFeatureSeries;
        highchartsConfig.yAxis[1].visible = this.showEntriesSeries;
        highchartsConfig.yAxis[2].visible = this.showElapsedSeries;
        if (!isTimeseries) highchartsConfig.xAxis.title.text = this.xAxisLabel;

        chartModel.setHighchartsConfig(highchartsConfig);
        chartModel.setSeries(series);
    }

    getCategoryData() {
        const {data, colors} = this,
            {featuredSeries, entriesSeries, elapsedSeries} = colors,
            xAxisDim = this.dimensions[0],
            chartData = sortBy(data, (it => xAxisDim == 'day' ? LocalDate.from(it.cubeLabel).timestamp : it.cubeLabel)),
            dimCounts = [],
            entryCounts = [],
            elapsed = [];

        chartData.forEach((it) => {
            const xAxisCat = xAxisDim == 'day' ? fmtDate(it.cubeLabel) : it.cubeLabel;
            dimCounts.push([xAxisCat, it.count]);
            entryCounts.push([xAxisCat, it.entryCount]);
            elapsed.push([xAxisCat, Math.round(it.elapsed)]);
        });

        return [
            {name: this.yAxisLabel, color: featuredSeries, visible: this.showFeatureSeries, data: dimCounts, yAxis: 0},
            {name: `Entries`, color: entriesSeries, visible: this.showEntriesSeries, data: entryCounts, yAxis: 1},
            {name: 'Elapsed', color: elapsedSeries, visible: this.showElapsedSeries, data: elapsed, yAxis: 2}
        ];
    }

    getTimeseriesData() {
        const {data, colors} = this,
            {featuredSeries, entriesSeries, elapsedSeries} = colors,
            chartData = sortBy(data, (it => it.cubeLabel)),
            dimCounts = [],
            entryCounts = [],
            elapsed = [];

        chartData.forEach((it) => {
            dimCounts.push([LocalDate.from(it.cubeLabel).timestamp, it.count]);
            entryCounts.push([LocalDate.from(it.cubeLabel).timestamp, it.entryCount]);
            elapsed.push([LocalDate.from(it.cubeLabel).timestamp, Math.round(it.elapsed)]);
        });

        return [
            {name: this.yAxisLabel, color: featuredSeries, visible: this.showFeatureSeries, data: dimCounts, yAxis: 0},
            {name: `Entries`, color: entriesSeries, visible: this.showEntriesSeries, data: entryCounts, yAxis: 1},
            {name: 'Elapsed', color: elapsedSeries, visible: this.showElapsedSeries, data: elapsed, yAxis: 2}
        ];
    }

    ensureProperTimeseriesChartState(enable) {
        if (!enable) {
            this.setChartType('category');
        }
    }

    loadChartReaction() {
        return {
            track: () => [
                this.data,
                this.chartType,
                this.showFeatureSeries,
                this.showEntriesSeries,
                this.showElapsedSeries
            ],
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
            run: (dark) => {
                const {colors, categoryChartModel, timeseriesChartModel} = this,
                    {elapsedSeries} = colors,
                    catChartConf = cloneDeep(categoryChartModel.highchartsConfig),
                    timeChartConf = cloneDeep(timeseriesChartModel.highchartsConfig);

                catChartConf.yAxis[2].title.style.color = dark ? '#FFF' : elapsedSeries;
                timeChartConf.yAxis[2].title.style.color = dark ? '#FFF' : elapsedSeries;

                categoryChartModel.setHighchartsConfig(catChartConf);
                timeseriesChartModel.setHighchartsConfig(timeChartConf);
            }
        };
    }

}