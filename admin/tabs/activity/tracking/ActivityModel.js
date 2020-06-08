/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isEmpty, isFinite} from 'lodash';
import {usernameCol} from '@xh/hoist/admin/columns';
import {dateTimeCol, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {fmtDate, numberRenderer} from '@xh/hoist/format';
import {action, bindable, comparer, observable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {DimensionChooserModel} from '@xh/hoist/cmp/dimensionchooser';
import {Cube} from '@xh/hoist/data';
import {ChildCountAggregator, LeafCountAggregator, RangeAggregator} from '../aggregators';
import {ChartsModel} from './charts/ChartsModel';

@HoistModel
@LoadSupport
export class ActivityModel {

    static persistWith = {localStorageKey: 'xhAdminActivityState'};

    @bindable.ref startDate = LocalDate.today().subtract(7);
    @bindable.ref endDate = LocalDate.today().add(1);  // https://github.com/xh/hoist-react/issues/400
    @bindable username = '';
    @bindable msg = '';
    @bindable category = '';
    @bindable device = '';
    @bindable browser = '';

    @observable.ref detailRecord = null;

    @managed
    dimChooserModel = new DimensionChooserModel({
        persistWith: this.persistWith,
        enableClear: true,
        dimensions: [
            {label: 'Date', value: 'day'},
            {label: 'User', value: 'username'},
            {label: 'Message', value: 'msg'},
            {label: 'Category', value: 'category'},
            {label: 'Device', value: 'device'},
            {label: 'Browser', value: 'browser'},
            {label: 'User Agent', value: 'userAgent'}
        ],
        initialValue: ['day', 'username', 'msg']
    });

    @managed
    cube = new Cube({
        fields: [
            {name: 'day', isDimension: true, aggregator: new RangeAggregator()},
            {name: 'username', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'msg', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'category', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'device', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'browser', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'userAgent', isDimension: true, aggregator: 'UNIQUE'},

            {name: 'elapsed', aggregator: 'AVG'},
            {name: 'impersonating'},
            {name: 'dateCreated'},
            {name: 'data'},
            {name: 'count', aggregator: new ChildCountAggregator()},
            {name: 'entryCount', aggregator: new LeafCountAggregator()} // Used for charting, not displayed in grid,
        ]
    });

    @managed
    gridModel = new GridModel({
        treeMode: true,
        persistWith: this.persistWith,
        enableColChooser: true,
        enableExport: true,
        exportOptions: {filename: () => `Activity ${fmtDate(this.startDate)} to ${fmtDate(this.endDate)}`},
        emptyText: 'No activity reported...',
        sortBy: 'dateCreated|desc',
        columns: [
            {
                field: 'cubeLabel',
                headerName: 'Track',
                width: 160,
                isTreeColumn: true,
                renderer: (v, params) => params.record.raw.cubeDimension === 'day' ? fmtDate(v) : v
            },
            {field: 'username', ...usernameCol},
            {field: 'day', width: 200, align: 'right', renderer: this.dateRangeRenderer},
            {field: 'category', width: 100},
            {field: 'device', width: 100},
            {field: 'browser', width: 100},
            {field: 'userAgent', width: 100, hidden: true},
            {field: 'impersonating', width: 140},
            {
                field: 'elapsed',
                headerName: 'Avg Elapsed (ms)',
                width: 130,
                align: 'right',
                renderer: numberRenderer({precision: 0})
            },
            {field: 'msg', headerName: 'Message', flex: true, minWidth: 120},
            {field: 'data', width: 70},
            {field: 'count', width: 70, align: 'right'},
            {field: 'dateCreated', headerName: 'Timestamp', ...dateTimeCol}
        ]
    });

    @managed chartsModel = new ChartsModel();

    constructor() {
        this.addReaction(this.paramsReaction());
        this.addReaction(this.dimensionsReaction());
    }

    async doLoadAsync(loadSpec) {
        try {
            const data = await XH.fetchJson({
                url: 'trackLogAdmin',
                params: this.getParams(),
                loadSpec
            });

            data.forEach(it => {
                it.id = `entry: ${it.id}`;
                it.day = LocalDate.from(it.dateCreated);
            });
            await this.cube.loadDataAsync(data);
            this.loadGridAndChart();
        } catch (e) {
            this.gridModel.loadData([]);
            this.chartsModel.setDimensions(this.dimChooserModel.value);
            this.chartsModel.setData([]);
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
        this.chartsModel.setDimensions(dimensions);
        this.chartsModel.setData(data);
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
        this.chartsModel.setEnableTimeseries(enable);
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
                this.ensureProperTimeseriesChartState(v[0] == 'day');
                this.loadGridAndChart();
            }
        };
    }
}