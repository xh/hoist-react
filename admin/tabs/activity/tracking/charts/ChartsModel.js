/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {ChartModel} from '@xh/hoist/cmp/chart';
import {br, fragment} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, lookup} from '@xh/hoist/core';
import {capitalizeWords, fmtDate} from '@xh/hoist/format';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {sortBy} from 'lodash';
import moment from 'moment';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {ActivityTrackingModel} from '../ActivityTrackingModel';
import {ONE_DAY} from '@xh/hoist/utils/datetime/DateTimeUtils';

export class ChartsModel extends HoistModel {
    @managed panelModel = new PanelModel({
        modalSupport: {width: '90vw', height: '60vh'},
        side: 'bottom',
        defaultSize: 370
    });

    /** @member {ActivityTrackingModel} */
    @lookup(ActivityTrackingModel) activityTrackingModel;

    /** @member {string} - metric to chart on Y axis - one of:
     *      + entryCount - count of total track log entries within the primary dim group.
     *      + count - count of unique secondary dim values within the primary dim group.
     *      + elapsed - avg elapsed time in ms for the primary dim group.
     */
    @bindable metric = 'entryCount';

    /** @member {ChartModel} */
    @managed categoryChartModel = new ChartModel({
        highchartsConfig: {
            chart: {type: 'column', animation: false},
            plotOptions: {column: {animation: false}},
            legend: {enabled: false},
            title: {text: null},
            xAxis: {type: 'category', title: {}},
            yAxis: [{title: {text: null}, allowDecimals: false}]
        }
    });

    /** @member {ChartModel} */
    @managed timeseriesChartModel = new ChartModel({
        highchartsConfig: {
            chart: {type: 'line', animation: false},
            plotOptions: {
                line: {
                    events: {
                        click: async event => {
                            const date = moment(event.point.x).format('YYYY MM DD').split(' ').join('-');
                            const id = `root>>day=[${date}]`;
                            await this.selectRow(id);
                        }
                    },
                    width: 1,
                    animation: false,
                    step: 'left'
                }
            },
            legend: {enabled: false},
            title: {text: null},
            xAxis: {
                type: 'datetime',
                title: {},
                units: [['day', [1]], ['week', [2]], ['month', [1]]],
                labels: {
                    formatter: function () {
                        return fmtDate(this.value, 'D MMM');
                    }
                }
            },
            yAxis: [{title: {text: null}, allowDecimals: false}]
        }
    });

    get showAsTimeseries() {
        return this.dimensions[0] === 'day';
    }

    /** @returns {ChartModel} */
    get chartModel() {
        return this.showAsTimeseries ? this.timeseriesChartModel : this.categoryChartModel;
    }

    /** @returns {string} */
    get primaryDim() {
        return this.dimensions[0];
    }

    /** @returns {string} */
    get secondaryDim() {
        const {dimensions} = this;
        return (dimensions.length >= 2) ? dimensions[1] : null;
    }

    get data() {
        const roots = this.activityTrackingModel.gridModel.store.allRootRecords;
        return roots.length ? roots[0].children : [];
    }

    get dimensions() {
        return this.activityTrackingModel.dimensions;
    }

    constructor() {
        super();
        makeObservable(this);
        window.chartsModel = this;
    }

    async selectRow(id) {
        await this.activityTrackingModel.gridModel.selectAsync(id);
    }

    onLinked() {
        this.addReaction({
            track: () => [this.data, this.metric],
            run: () => this.loadChart()
        });
    }

    loadChart() {
        const {showAsTimeseries, chartModel, primaryDim} = this,
            series = this.getSeriesData();

        if (!showAsTimeseries) {
            chartModel.updateHighchartsConfig({
                xAxis: {title: {text: this.getUnitsForDim(primaryDim)}}
            });
        }

        chartModel.setSeries(series);
    }

    getSeriesData() {
        const {data, metric, primaryDim, showAsTimeseries} = this,
            metricLabel = this.getLabelForMetric(metric, false),
            sortedData = sortBy(data, aggRow => {
                const {cubeLabel} = aggRow.data;
                switch (primaryDim) {
                    case 'day':
                        return LocalDate.from(cubeLabel).timestamp;
                    case 'month':
                        return moment(cubeLabel, 'MMM YYYY').valueOf();
                    default:
                        return cubeLabel;
                }
            }),
            chartData = sortedData.map(aggRow => {
                const {cubeLabel} = aggRow.data,
                    xVal = showAsTimeseries ? LocalDate.from(cubeLabel).timestamp : cubeLabel,
                    yVal = Math.round(aggRow.data[metric]);
                return [xVal, yVal];
            });

        if(showAsTimeseries) {
            const nullData = [];
            for (let i = 1; i < chartData.length; i++) {
                const nullDayCount = (((chartData[i][0] - chartData[i - 1][0]) / ONE_DAY) - 1);
                if (nullDayCount > 0) {
                    for (let j = 1; j <= nullDayCount; j++) {
                        const nullDay = chartData[i - 1][0] + (j * ONE_DAY)
                        nullData.push([nullDay, 0]);
                    }
                }
            }
            if(nullData.length) {
                chartData.push(...nullData);
                return [{name: metricLabel, data: sortBy(chartData, data => data[0])}];
            }
        }

        return [{name: metricLabel, data: chartData}];
    }

    getLabelForMetric(metric, multiline) {
        switch (metric) {
            case 'count':
                return multiline ?
                    fragment(`Unique`, br(), `${this.getUnitsForDim(this.secondaryDim)} Count`) :
                    `Unique ${this.getUnitsForDim(this.secondaryDim)} Count`;
            case 'entryCount':
                return multiline ?
                    fragment('Total', br(), 'Entry Count') :
                    'Total Entry Count';
            case 'elapsed':
                return 'Elapsed ms';
            default:
                return '???';
        }
    }

    getUnitsForDim(dim) {
        return {
            username: 'User',
            msg: 'Message'
        }[dim] ?? capitalizeWords(dim);
    }

}
