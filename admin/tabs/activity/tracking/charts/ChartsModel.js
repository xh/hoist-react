/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {ChartModel} from '@xh/hoist/cmp/chart';
import {br, fragment} from '@xh/hoist/cmp/layout';
import {HoistModel, managed} from '@xh/hoist/core';
import {capitalizeWords, fmtDate} from '@xh/hoist/format';
import {action, bindable, observable, makeObservable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {sortBy} from 'lodash';
import moment from 'moment';

export class ChartsModel extends HoistModel {

    /** @member {ActivityTrackingModel} */
    parentModel;

    @observable.ref data = [];
    @observable.ref dimensions = [];

    /** @member {string} - metric to chart on Y axis - one of:
     *      + entryCount - count of total track log entries within the primary dim group.
     *      + count - count of unique secondary dim values within the primary dim group.
     *      + elapsed - avg elapsed time in ms for the primary dim group.
     */
    @bindable metric = 'entryCount'

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

    @managed timeseriesChartModel = new ChartModel({
        highchartsConfig: {
            chart: {type: 'line', animation: false},
            plotOptions: {
                line: {
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
                    formatter: function() {return fmtDate(this.value, 'D MMM')}
                }
            },
            yAxis: [{title: {text: null}, allowDecimals: false}]
        }
    });

    @observable showDialog = false;

    @action
    async toggleDialog() {
        this.showDialog = !this.showDialog;

        // Hack to get primary, non-dialog chart to re-render once dialog is dismissed.
        // Sharing chart models between chart component instances appears to be risky...
        await wait();
        this.chartModel.setHighchartsConfig({...this.chartModel.highchartsConfig});
    }

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

    @action
    setDataAndDims({data, dimensions}) {
        this.dimensions = dimensions;
        this.data = data;
    }

    constructor({parentModel}) {
        super();
        makeObservable(this);
        this.parentModel = parentModel;

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
                const {cubeLabel} = aggRow;
                switch (primaryDim) {
                    case 'day': return LocalDate.from(cubeLabel).timestamp;
                    case 'month': return moment(cubeLabel, 'MMM YYYY').valueOf();
                    default: return cubeLabel;
                }
            }),
            chartData = sortedData.map(aggRow => {
                const xVal = showAsTimeseries ? LocalDate.from(aggRow.cubeLabel).timestamp : aggRow.cubeLabel;
                return [xVal, Math.round(aggRow[metric])];
            });

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
