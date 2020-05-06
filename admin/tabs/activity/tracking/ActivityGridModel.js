/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isEmpty, isFinite} from 'lodash';
import {usernameCol} from '@xh/hoist/admin/columns';
import {dateTimeCol, GridModel, dateCol} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {fmtDate, numberRenderer} from '@xh/hoist/format';
import {action, bindable, comparer, observable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {DimensionChooserModel} from '@xh/hoist/cmp/dimensionchooser';
import {Cube} from '@xh/hoist/data';
import {TreeMapModel} from '@xh/hoist/desktop/cmp/treemap';

@HoistModel
@LoadSupport
export class ActivityGridModel {

    @bindable.ref startDate = LocalDate.today().subtract(7);
    @bindable.ref endDate = LocalDate.today().add(1);  // https://github.com/xh/hoist-react/issues/400
    @bindable username = '';
    @bindable msg = '';
    @bindable category = '';
    @bindable device = '';
    @bindable browser = '';

    @observable.ref detailRecord = null;

    @managed dimChooserModel = new DimensionChooserModel({
        enableClear: true,
        dimensions: [
            {label: 'Severity', value: 'severity'},
            {label: 'Day', value: 'day'},
            {label: 'User', value: 'username'},
            {label: 'Message', value: 'msg'},
            {label: 'Category', value: 'category'},
            {label: 'Device', value: 'device'},
            {label: 'Browser', value: 'browser'}
        ],
        initialValue: ['day', 'username', 'msg']
    });

    cube = new Cube({
        fields: [
            {name: 'severity', isDimension: true, aggregator: 'COUNT'},
            {name: 'day', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'username', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'msg', isDimension: true, aggregator: 'COUNT'},
            {name: 'category', isDimension: true, aggregator: 'COUNT'},
            {name: 'device', isDimension: true, aggregator: 'COUNT'},
            {name: 'browser', isDimension: true, aggregator: 'COUNT'},


            {name: 'userAgent'},
            {name: 'impersonating'},
            {name: 'elapsed', aggregator: 'AVG'},
            {name: 'dateCreated', aggregator: 'RANGE'},
            {name: 'data'}
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
            {field: 'cubeLabel', width: 160, isTreeColumn: true},
            {field: 'severity', width: 100},
            {field: 'dateCreated', ...dateTimeCol, renderer: this.dateRangeRenderer},
            {field: 'username', ...usernameCol},
            {field: 'day', ...dateCol},
            {field: 'category', width: 100},
            {field: 'device', width: 100},
            {field: 'browser', width: 100},
            {field: 'userAgent', width: 100, hidden: true},
            {field: 'data', width: 70},
            {field: 'impersonating', width: 140},
            {
                field: 'elapsed',
                headerName: 'Elapsed (ms)',
                width: 130,
                align: 'right',
                renderer: numberRenderer({precision: 0})
            },
            {field: 'msg', headerName: 'Message', flex: true, minWidth: 120}
        ]
    });

    @managed
    treeMapModel = new TreeMapModel({
        gridModel: this.gridModel,
        labelField: 'cubeLabel',
        valueField: 'msg',
        heatField: 'elapsed' // TODO: Useful but a little weird that 'slow' is 'greener'
    });

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

            data.forEach(it => it.day = fmtDate(it.dateCreated));
            await this.cube.loadDataAsync(data);
            this.loadGrid();
        } catch (e) {
            this.gridModel.loadData([]);
            XH.handleException(e);
        }
    }

    loadGrid() {
        const data = this.cube.executeQuery({
            dimensions: this.dimChooserModel.value,
            includeLeaves: true
        });

        this.gridModel.loadData(data);
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
            equals: comparer.structural
        };
    }

    dimensionsReaction() {
        return {
            track: () => this.dimChooserModel.value,
            run: () => this.loadGrid()
        };
    }
}