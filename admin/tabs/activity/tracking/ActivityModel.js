/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isEmpty, isFinite, cloneDeep, reverse} from 'lodash';
import {usernameCol} from '@xh/hoist/admin/columns';
import {dateTimeCol, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {fmtDate, numberRenderer} from '@xh/hoist/format';
import {action, bindable, comparer, observable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {DimensionChooserModel} from '@xh/hoist/cmp/dimensionchooser';
import {Cube} from '@xh/hoist/data';
import {ChartModel} from '@xh/hoist/cmp/chart';
import {capitalizeWords} from '../../../../format';

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

    @bindable chartType = 'column';

    @observable.ref detailRecord = null;

    // TODO: Create pref
    @managed dimChooserModel = new DimensionChooserModel({
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
            {name: 'elapsed', aggregator: 'AVG'}, // Aggregator shows the averages of the children (an ave of averages) which is not the same as the average of all the leaves. Can this be right?
            {name: 'impersonating'},
            {name: 'dateCreated'},
            {name: 'data'},
            {name: 'count', aggregator: 'COUNT'}
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
            {field: 'count', width: 70},
            {field: 'dateCreated', headerName: 'Timestamp', ...dateTimeCol}
        ]
    });

    @managed
    chartModel = new ChartModel({
        highchartsConfig: {
            chart: {type: 'column'},
            plotOptions: {
                column: {animation: false}
            },
            legend: {enabled: false},
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
                        text: 'Unique Users' // TODO will need to change with dim changes
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

    constructor() {
        this.addReaction(this.paramsReaction());
        this.addReaction(this.dimensionsReaction());
        this.addReaction(this.chartTypeReaction());
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
                it.cubeDay = fmtDate(it.dateCreated); // We need a pre-formatted string to use as a dimension/cubeLabel
                it.day = it.dateCreated; // Separate field for range aggregator
                it.count = 1; // Separate field for range aggregator
            });
            await this.cube.loadDataAsync(data);
            this.loadGridAndChart();
        } catch (e) {
            this.gridModel.loadData([]);
            XH.handleException(e);
        }
    }

    loadGridAndChart() {
        const dimensions = this.dimChooserModel.value,
            data = this.cube.executeQuery({
                dimensions,
                includeLeaves: true
            });

        this.gridModel.loadData(data);
        if (dimensions[0] === 'cubeDay') {
            const {chartModel} = this,
                highchartsConfig = cloneDeep(chartModel.highchartsConfig);
            highchartsConfig.yAxis[0].title.text = `Unique ${capitalizeWords(dimensions[1] || 'Log')}s`; // TODO be smarter about this plurlization (i think we can inflector examples somewhere) or make a label map (might be better cause we don't want 'usernames')
            highchartsConfig.chart.type = this.chartType

            this.chartModel.setHighchartsConfig(highchartsConfig);
            this.chartModel.setSeries(this.getSeriesData(data));
        }
    }

    getSeriesData(cubeData) {
        // The cube will provide the data from latest to earliest, this causes rendering issues with the bar chart
        const counts = [],
            elapsed = [];

        cubeData.forEach((it) => {
            counts.push([LocalDate.from(it.cubeLabel).timestamp, it.children.length]);
            elapsed.push([LocalDate.from(it.cubeLabel).timestamp, it.elapsed]);
        });
        // The cube will provide the data from latest to earliest, this causes rendering issues with the bar chart
        return [{data: reverse(counts), yAxis: 0}, {data: reverse(elapsed), yAxis: 1}];
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
            run: () => this.loadGridAndChart()
        };
    }

    chartTypeReaction() {
        return {
            track: () => this.chartType,
            run: () => this.loadGridAndChart()
        };
    }
}