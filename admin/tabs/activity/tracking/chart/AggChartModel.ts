/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ChartModel} from '@xh/hoist/cmp/chart';
import {HoistModel, lookup, managed, SelectOption} from '@xh/hoist/core';
import {Cube, StoreRecord} from '@xh/hoist/data';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {pluralize} from '@xh/hoist/utils/js';
import {isEmpty, last, sortBy} from 'lodash';
import moment from 'moment';
import {ActivityTrackingModel} from '../ActivityTrackingModel';

export class AggChartModel extends HoistModel {
    @lookup(ActivityTrackingModel)
    activityTrackingModel: ActivityTrackingModel;

    /**
     * Metric to chart on Y axis - one of:
     *  - entryCount - count of total track log entries within the primary dim group.
     *  - count - count of unique secondary dim values within the primary dim group.
     *  - elapsed - avg elapsed time in ms for the primary dim group.
     *  - any other numeric, aggregated custom data field metrics, if so configured
     */
    @bindable metric: string = 'entryCount';

    @computed
    get metricLabel() {
        return this.selectableMetrics.find(it => it.value === this.metric)?.label ?? this.metric;
    }

    @bindable incWeekends: boolean = true;

    @managed chartModel: ChartModel;

    get showAsTimeseries(): boolean {
        return this.primaryDim === 'day';
    }

    get selectableMetrics(): SelectOption[] {
        const {activityTrackingModel, secondaryDim, secondaryDimLabel} = this;
        if (!activityTrackingModel) return [];

        const ret: SelectOption[] = [
            {label: 'Entries [count]', value: 'entryCount'},
            {label: 'Elapsed [avg]', value: 'elapsed'},
            {label: 'Elapsed [max]', value: 'elapsedMax'}
        ];

        if (secondaryDim) {
            ret.push({
                label: `Unique ${pluralize(secondaryDimLabel)} [count]`,
                value: 'count'
            });
        }

        const dfMetrics = activityTrackingModel.dataFields.filter(
            it => (it.type === 'int' || it.type === 'number') && it.aggregator
        );

        dfMetrics.forEach(it => {
            ret.push({
                label: `${it.displayName} [${it.aggregator.toLowerCase()}]`,
                value: it.name
            });
        });

        return sortBy(ret, 'label');
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.chartModel = this.createChartModel();

        const {persistWith} = this.activityTrackingModel;
        this.markPersist('metric', {...persistWith, path: 'chartMetric'});
        this.markPersist('incWeekends', {...persistWith, path: 'chartIncWeekends'});

        this.addReaction(
            {
                track: () => [this.data, this.metric, this.incWeekends],
                run: () => this.loadChart()
            },
            {
                track: () => this.selectableMetrics,
                run: () => this.onSelectableMetricsChange()
            }
        );
    }

    //-----------------
    // Implementation
    //-----------------
    private get cube(): Cube {
        return this.activityTrackingModel?.cube;
    }

    private get dimensions() {
        return this.activityTrackingModel.dimensions;
    }

    private get primaryDim(): string {
        return this.dimensions[0];
    }

    private get primaryDimLabel(): string {
        return this.getDisplayName(this.primaryDim);
    }

    private get secondaryDim(): string {
        const {dimensions} = this;
        return dimensions.length >= 2 ? dimensions[1] : null;
    }

    private get secondaryDimLabel(): string {
        return this.getDisplayName(this.secondaryDim);
    }

    private get data() {
        const roots = this.activityTrackingModel.gridModel.store.allRootRecords;
        return roots.length ? roots[0].children : [];
    }

    private createChartModel(): ChartModel {
        return new ChartModel({
            highchartsConfig: {
                chart: {type: 'column', animation: false},
                plotOptions: {
                    column: {
                        animation: false,
                        borderWidth: 0,
                        events: {
                            click: e => this.selectRow(e)
                        }
                    }
                },
                legend: {enabled: false},
                title: {text: null},
                xAxis: {type: 'category', title: {}},
                yAxis: [{title: {text: null}, allowDecimals: false}]
            }
        });
    }

    private selectRow(e) {
        const id = `root>>${this.primaryDim}=[${e.point.name}]`;
        this.activityTrackingModel.gridModel.selectAsync(id);
    }

    private loadChart() {
        const {primaryDim, chartModel, primaryDimLabel} = this,
            xAxisTitle = ['day', 'month'].includes(primaryDim) ? null : primaryDimLabel,
            series = this.getSeriesData();

        chartModel.setSeries(series);
        chartModel.updateHighchartsConfig({
            xAxis: {title: {text: xAxisTitle}}
        });
    }

    private getSeriesData() {
        const {data, metric, metricLabel, primaryDim, showAsTimeseries, incWeekends} = this,
            sortedData = sortBy(data, aggRow => {
                const {cubeLabel} = aggRow.data;
                switch (primaryDim) {
                    case 'month':
                        return moment(cubeLabel, 'MMM YYYY').valueOf();
                    default:
                        return cubeLabel;
                }
            }),
            chartData = [];

        // Early out if no data.
        if (isEmpty(sortedData)) {
            return [{metric: metricLabel, data: chartData}];
        }

        // Special handling for timeseries - pad series internally so we can use a category axis
        // with option to skip weekends, while retaining relative spacing between included days.
        if (showAsTimeseries) {
            // Index data we do have by day, for quick retrieval below.
            const byDay: Record<string, StoreRecord> = {};
            sortedData.forEach(it => {
                byDay[it.data.cubeLabel] = it;
            });

            // Walk from first to last day, ensuring we have a point or placeholder for each one.
            let dataDay = LocalDate.get(sortedData[0].data.cubeLabel);
            const lastDay = LocalDate.get(last(sortedData).data.cubeLabel);
            while (dataDay <= lastDay) {
                if (incWeekends || dataDay.isWeekday) {
                    const xVal = dataDay.toString(),
                        yVal = byDay[xVal]?.data[metric] ?? null;
                    chartData.push([xVal, Math.round(yVal)]);
                }

                dataDay = dataDay.nextDay();
            }
        } else {
            sortedData.forEach(it => {
                chartData.push([it.data.cubeLabel, Math.round(it.data[metric])]);
            });
        }

        return [{name: metricLabel, data: chartData}];
    }

    private getDisplayName(fieldName: string) {
        return this.activityTrackingModel?.getDisplayName(fieldName) ?? fieldName;
    }

    private onSelectableMetricsChange(): void {
        const {metric} = this;
        if (!this.selectableMetrics.some(it => it.value === metric)) {
            this.metric = this.selectableMetrics[0]?.value;
        }
    }
}
