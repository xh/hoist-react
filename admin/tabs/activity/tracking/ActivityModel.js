/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isEmpty, isFinite, cloneDeep, reverse, find} from 'lodash';
import {usernameCol} from '@xh/hoist/admin/columns';
import {dateTimeCol, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {fmtDate, numberRenderer} from '@xh/hoist/format';
import {action, bindable, comparer, observable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {DimensionChooserModel} from '@xh/hoist/cmp/dimensionchooser';
import {Cube} from '@xh/hoist/data';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {chart} from '@xh/hoist/cmp/chart';
import {Icon} from '@xh/hoist/icon';
import {TabContainerModel} from '../../../../cmp/tab';

@HoistModel
@LoadSupport
export class ActivityModel {

    @bindable.ref startDate = LocalDate.today().subtract(7);
    @bindable.ref endDate = LocalDate.today().add(1);  // https://github.com/xh/hoist-react/issues/400
    @bindable username = '';
    @bindable msg = '';
    @bindable category = '';
    @bindable device = '';
    @bindable browser = '';

    @bindable chartAllLogs = false;

    @observable.ref detailRecord = null;

    axisLabelMap = {
        username: 'Users',
        msg: 'Messages',
        category: 'Categories',
        device: 'Devices',
        browser: 'Browsers',
        userAgent: 'Agents',
        cubeDay: 'Days'
    };

    // TODO: Create pref
    @managed
    dimChooserModel = new DimensionChooserModel({
        enableClear: true,
        dimensions: [
            {label: 'Date', value: 'cubeDay'},
            {label: 'User', value: 'username'},
            {label: 'Message', value: 'msg'},
            {label: 'Category', value: 'category'},
            {label: 'Device', value: 'device'},
            {label: 'Browser', value: 'browser'},
            {label: 'User Agent', value: 'userAgent'}
        ],
        initialValue: ['cubeDay', 'username', 'msg']
    });

    @managed
    cube = new Cube({
        fields: [
            {name: 'cubeDay', isDimension: true},
            {name: 'username', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'msg', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'category', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'device', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'browser', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'userAgent', isDimension: true, aggregator: 'UNIQUE'},

            {name: 'day', aggregator: 'RANGE'},
            {name: 'elapsed', aggregator: 'AVG'},
            {name: 'impersonating'},
            {name: 'dateCreated'},
            {name: 'data'},
            {name: 'count', aggregator: 'CHILD_COUNT'},
            {name: 'logCount', aggregator: 'LEAF_COUNT'}
        ]
    })

    @managed
    gridModel = new GridModel({
        treeMode: true,
        stateModel: 'xhActivityGrid',
        enableColChooser: true,
        enableExport: true,
        exportOptions: {filename: () => `Activity ${fmtDate(this.startDate)} to ${fmtDate(this.endDate)}`},
        emptyText: 'No activity reported...',
        sortBy: 'dateCreated|desc',
        columns: [
            {field: 'cubeLabel', headerName: 'Track', width: 160, isTreeColumn: true},
            {field: 'username', ...usernameCol},
            {field: 'day', width: 200, align: 'right', renderer: this.dateRangeRenderer},
            {field: 'category', width: 100},
            {field: 'device', width: 100},
            {field: 'browser', width: 100},
            {field: 'userAgent', width: 100, hidden: true},
            {field: 'impersonating', width: 140},
            {
                field: 'elapsed',
                headerName: 'Elapsed (ms)',
                width: 130,
                align: 'right',
                renderer: numberRenderer({precision: 0})
            },
            {field: 'msg', headerName: 'Message', flex: true, minWidth: 120},
            {field: 'data', width: 70},
            {field: 'count', width: 70, align: 'right', renderer: numberRenderer()},
            {field: 'dateCreated', headerName: 'Timestamp', ...dateTimeCol}
        ]
    });

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
                        text: 'Count'
                    },
                    allowDecimals: false
                },
                {
                    title: {
                        text: 'Average Elapsed (ms)'
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
                        text: 'Count'
                    },
                    allowDecimals: false
                },
                {
                    title: {
                        text: 'Average Elapsed (ms)'
                    },
                    opposite: true
                }
            ]
        }
    });

    get xAxisLabel() {
        const dim = this.dimChooserModel.value[0],
            label = this.axisLabelMap[dim];

        return this.chartAllLogs || !label ? 'Logs' : label;
    }

    get yAxisLabel() {
        const dim = this.dimChooserModel.value[1],
            label = this.axisLabelMap[dim];

        return this.chartAllLogs || !label ? 'Logs' : label;
    }

    constructor() {
        this.addReaction(this.paramsReaction());
        this.addReaction(this.dimensionsReaction());
        this.addReaction(this.chartLogsReaction());
        this.addReaction(this.activeChartReaction());
    }

    async doLoadAsync(loadSpec) {
        try {
            const data = await XH.fetchJson({
                url: 'trackLogAdmin',
                params: this.getParams(),
                loadSpec
            });

            data.forEach(it => {
                it.id = `id: ${it.id}`;
                it.cubeDay = fmtDate(it.dateCreated); // Need a pre-formatted string to use as a dimension/cubeLabel
                it.day = it.dateCreated; // Separate field for range aggregator
                it.count = 1;
            });
            await this.cube.loadDataAsync(data);
            this.loadGridAndChart();
        } catch (e) {
            this.gridModel.loadData([]);
            XH.handleException(e);
        }
    }

    loadGridAndChart() {
        const data = this.queryCube();

        this.gridModel.loadData(data);
        this.loadChart();
    }

    loadChart() {
        // Why is this firing twice on load?
        this.tabContainerModel.activeTabId == 'Timeseries' ? this.loadTimeseriesChart() : this.loadCategoryChart();
    }

    loadTimeseriesChart() {
        const chartData = this.queryCube(),
            chartModel = this.timeSeriesChartModel,
            highchartsConfig = cloneDeep(chartModel.highchartsConfig);

        highchartsConfig.yAxis[0].title.text = `Unique ${this.yAxisLabel}`;

        chartModel.setHighchartsConfig(highchartsConfig);
        chartModel.setSeries(this.getTimeseriesData(chartData));
    }

    getTimeseriesData(cubeData) {
        const counts = [],
            elapsed = [];

        cubeData.forEach((it) => {
            const count = this.chartAllLogs ? it.logCount : it.count;
            counts.push([LocalDate.from(it.cubeLabel).timestamp, count]);
            elapsed.push([LocalDate.from(it.cubeLabel).timestamp, it.elapsed]);
        });

        // The cube will provide the data from latest to earliest, this causes rendering issues with the bar chart
        return [{name: this.yAxisLabel, data: reverse(counts), yAxis: 0}, {name: 'Elapsed', data: reverse(elapsed), yAxis: 1}];
    }

    loadCategoryChart() {
        const chartData = this.queryCube(),
            chartModel = this.categoryChartModel,
            highchartsConfig = cloneDeep(chartModel.highchartsConfig);

        highchartsConfig.yAxis[0].title.text = `Unique ${this.yAxisLabel}`;
        highchartsConfig.xAxis.title.text = this.xAxisLabel;

        chartModel.setHighchartsConfig(highchartsConfig);
        chartModel.setSeries(this.getCategoryData(chartData));
    }

    getCategoryData(cubeData) {
        const counts = [],
            elapsed = [];

        cubeData.forEach((it) => {
            const count = this.chartAllLogs ? it.logCount : it.count;
            counts.push([it[this.dimChooserModel.value[0]], count]);
            elapsed.push([it[this.dimChooserModel.value[0]], it.elapsed]);
        });

        // The cube will provide the data from latest to earliest, this causes rendering issues with the bar chart
        return [{name: `${this.yAxisLabel}`, data: reverse(counts), yAxis: 0}, {name: 'Elapsed', data: reverse(elapsed), yAxis: 1}];
    }

    queryCube() {
        const dimensions = this.dimChooserModel.value,
            data = this.cube.executeQuery({
                dimensions,
                includeLeaves: true
            });

        return data;
    }

    adjustDates(dir, toToday = false) {
        const today = LocalDate.today(),
            start = this.startDate,
            end = this.endDate,
            diff = end.diff(start),
            incr = diff + 1;

        let newStart = start[dir](incr),
            newEnd = end[dir](incr);

        if (newEnd.diff(today) > 0 || toToday) {
            newStart = today.subtract(Math.abs(diff));
            newEnd = today;
        }

        this.setStartDate(newStart);
        this.setEndDate(newEnd);
        this.loadAsync();
    }

    @action
    openDetail(rec) {
        const isLeaf = isEmpty(rec.children);
        if (isLeaf) this.detailRecord = rec;
    }

    @action
    closeDetail() {
        this.detailRecord = null;
    }

    ensureProperTimeseriesChartState(enable) {
        if (!enable) {
            this.tabContainerModel.setActiveTabId('Histogram');
        }

        this.tabContainerModel.tabs[1].setDisabled(!enable);
    }

    //----------------
    // Implementation
    //----------------
    getParams() {
        return {
            startDate: this.startDate,
            endDate: this.endDate,
            username: this.username,
            msg: this.msg,
            category: this.category,
            device: this.device,
            browser: this.browser
        };
    }

    dateRangeRenderer(range) {
        if (!range) return;
        if (isFinite(range)) return fmtDate(range);

        const {min, max} = range,
            minStr = fmtDate(min),
            maxStr = fmtDate(max);

        if (minStr === maxStr) return minStr;
        if (!max) return minStr; // TODO: If you have one you have the other? They maybe equal, but the only way you get null is if the whole collection is of nulls
        if (!min) return maxStr;
        return `${minStr} – ${maxStr}`;
    }

    paramsReaction() {
        return {
            track: () => this.getParams(),
            run: () => this.loadAsync(),
            equals: comparer.structural,
            fireImmediately: true
        };
    }

    dimensionsReaction() {
        return {
            track: () => this.dimChooserModel.value,
            run: (v) => {
                this.ensureProperTimeseriesChartState(v[0] == 'cubeDay');
                this.loadGridAndChart();
            }
        };
    }

    chartLogsReaction() {
        return {
            track: () => this.chartAllLogs,
            run: () => this.loadChart()
        };
    }

    activeChartReaction() {
        return {
            track: () => this.tabContainerModel.activeTabId,
            run: () => this.loadChart()
        };
    }
}