/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ChartModel} from '@xh/hoist/cmp/chart';
import {br, fragment} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, lookup} from '@xh/hoist/core';
import {capitalizeWords, fmtDate} from '@xh/hoist/format';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {filter, sortBy, isEmpty} from 'lodash';
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

    @lookup(ActivityTrackingModel)
    activityTrackingModel: ActivityTrackingModel;

    /** metric to chart on Y axis - one of:
     *      + entryCount - count of total track log entries within the primary dim group.
     *      + count - count of unique secondary dim values within the primary dim group.
     *      + elapsed - avg elapsed time in ms for the primary dim group.
     */
    @bindable
    metric: 'entryCount' | 'count' | 'elapsed' = 'entryCount';

    /** show weekends on the activity chart */
    @bindable
    incWeekends: boolean = false;

    @managed
    categoryChartModel: ChartModel = new ChartModel({
        highchartsConfig: {
            chart: {type: 'column', animation: false},
            plotOptions: {column: {animation: false}},
            legend: {enabled: false},
            title: {text: null},
            xAxis: {type: 'category', title: {}},
            yAxis: [{title: {text: null}, allowDecimals: false}]
        }
    });

    @managed
    timeseriesChartModel: ChartModel = new ChartModel({
        highchartsConfig: {
            chart: {type: 'line', animation: false},
            plotOptions: {
                line: {
                    events: {
                        click: e => this.selectRow(e)
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
                units: [
                    ['day', [1]],
                    ['week', [2]],
                    ['month', [1]]
                ],
                labels: {
                    formatter: function () {
                        return fmtDate(this.value, 'D MMM');
                    }
                }
            },
            yAxis: [{title: {text: null}, allowDecimals: false}]
        }
    });

    get showAsTimeseries(): boolean {
        return this.dimensions[0] === 'day';
    }

    get chartModel(): ChartModel {
        return this.showAsTimeseries ? this.timeseriesChartModel : this.categoryChartModel;
    }

    get primaryDim(): string {
        return this.dimensions[0];
    }

    get secondaryDim(): string {
        const {dimensions} = this;
        return dimensions.length >= 2 ? dimensions[1] : null;
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
    }

    getLabelForMetric(metric, multiline) {
        switch (metric) {
            case 'count':
                return multiline
                    ? fragment(`Unique`, br(), `${this.getUnitsForDim(this.secondaryDim)} Count`)
                    : `Unique ${this.getUnitsForDim(this.secondaryDim)} Count`;
            case 'entryCount':
                return multiline ? fragment('Total', br(), 'Entry Count') : 'Total Entry Count';
            case 'elapsed':
                return 'Elapsed ms';
            default:
                return '???';
        }
    }

    //-----------------
    // Implementation
    //-----------------

    private selectRow(e) {
        const date = moment(e.point.x).format('YYYY-MM-DD'),
            id = `root>>day=[${date}]`;
        this.activityTrackingModel.gridModel.selectAsync(id);
    }

    override onLinked() {
        this.addReaction({
            track: () => [this.data, this.metric, this.incWeekends],
            run: () => this.loadChart()
        });
    }

    private loadChart() {
        const {showAsTimeseries, chartModel, primaryDim} = this,
            series = this.getSeriesData();

        if (!showAsTimeseries) {
            chartModel.updateHighchartsConfig({
                xAxis: {title: {text: this.getUnitsForDim(primaryDim)}}
            });
        }

        chartModel.setSeries(series);
    }

    private getSeriesData() {
        const {data, metric, primaryDim, showAsTimeseries} = this,
            metricLabel = this.getLabelForMetric(metric, false);
        let sortedData = sortBy(data, aggRow => {
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

        // Insert data where no activity was logged
        if (showAsTimeseries) {
            const fillData = [];
            for (let i = 1; i < chartData.length; i++) {
                const skippedDayCount = Math.floor(
                    (chartData[i][0] - chartData[i - 1][0]) / ONE_DAY - 1
                );
                if (skippedDayCount > 0) {
                    for (let j = 1; j <= skippedDayCount; j++) {
                        const skippedDate = chartData[i - 1][0] + j * ONE_DAY;
                        fillData.push([skippedDate, 0]);
                    }
                }
            }
            if (!isEmpty(fillData)) {
                chartData.push(...fillData);
                chartData = sortBy(chartData, data => data[0]);
            }

            if (!this.incWeekends) {
                chartData = filter(chartData, data => LocalDate.from(data[0]).isWeekday);
            }
        }
        return [{name: metricLabel, data: chartData}];
    }

    private getUnitsForDim(dim) {
        return (
            {
                username: 'User',
                msg: 'Message'
            }[dim] ?? capitalizeWords(dim)
        );
    }
}
