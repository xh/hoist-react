/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {usernameCol} from '@xh/hoist/admin/columns';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {action, bindable, comparer, observable} from '@xh/hoist/mobx';
import {DimensionChooserModel} from '@xh/hoist/cmp/dimensionchooser';
import {boolCheckCol, dateTimeCol, GridModel} from '@xh/hoist/cmp/grid';
import {fmtDate, fmtSpan} from '@xh/hoist/format';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {Cube} from '@xh/hoist/data';
import {ChildCountAggregator, RangeAggregator} from '../aggregators';

@HoistModel
@LoadSupport
export class ClientErrorModel {

    persistWith = {localStorageKey: 'xhAdminClientErrorState'};

    @bindable.ref endDate = LocalDate.today();
    @bindable.ref startDate = LocalDate.today().subtract(7);
    @bindable username = '';
    @bindable error = '';

    @observable.ref detailRecord = null;

    @managed
    dimChooserModel = new DimensionChooserModel({
        persistWith: this.persistWith,
        enableClear: true,
        dimensions: [
            {label: 'Date', value: 'day'},
            {label: 'User', value: 'username'},
            {label: 'Alerted', value: 'userAlerted'},
            {label: 'Browser', value: 'browser'},
            {label: 'Device', value: 'device'},
            {label: 'User Agent', value: 'userAgent'},
            {label: 'App Version', value: 'appVersion'},
            {label: 'Message', value: 'msg'}
        ],
        initialValue: ['day', 'username', 'device']
    });

    @managed
    cube = new Cube({
        fields: [
            {name: 'day', isDimension: true, aggregator: new RangeAggregator()},
            {name: 'username', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'userAlerted', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'browser', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'device', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'userAgent', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'appVersion', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'appEnvironment', isDimension: true, aggregator: 'UNIQUE'},
            {name: 'msg', isDimension: true, aggregator: 'UNIQUE'},

            {name: 'dateCreated'},
            {name: 'error'},
            {name: 'count', aggregator: new ChildCountAggregator()}
        ]
    })

    @managed
    gridModel = new GridModel({
        treeMode: true,
        persistWith: this.persistWith,
        enableColChooser: true,
        enableExport: true,
        exportOptions: {filename: () => `Client Errors ${fmtDate(this.startDate)} to ${fmtDate(this.endDate)}`},
        emptyText: 'No errors reported...',
        sortBy: 'dateCreated|desc',
        columns: [
            {
                field: 'cubeLabel',
                headerName: 'Error',
                width: 240,
                isTreeColumn: true,
                renderer: (v, params) => params.record.raw.cubeDimension === 'day' ? fmtDate(v) : v
            },
            {field: 'day', width: 200, align: 'right', headerName: 'Day / Range', renderer: this.dateRangeRenderer},
            {field: 'username', ...usernameCol},
            {field: 'userAlerted', ...boolCheckCol, headerName: 'Alerted', width: 90},
            {field: 'browser', width: 100},
            {field: 'device', width: 100},
            {field: 'userAgent', width: 130, hidden: true},
            {field: 'appVersion', width: 130},
            {field: 'appEnvironment', headerName: 'Environment', width: 130},
            {field: 'msg', width: 130, hidden: true},
            {field: 'error', flex: true, minWidth: 150, autosizeMaxWidth: 400, renderer: (e) => fmtSpan(e)},
            {field: 'count', width: 70},
            {field: 'dateCreated', headerName: 'Timestamp', ...dateTimeCol}
        ]
    });

    constructor() {
        this.addReaction({
            track: () => this.getParams(),
            run: () => this.loadAsync(),
            equals: comparer.structural
        });
    }

    async doLoadAsync(loadSpec) {
        try {
            const data = await XH.fetchJson({
                url: 'clientErrorAdmin',
                params: this.getParams(),
                loadSpec
            });

            data.forEach(it => {
                it.id = `Entry: ${it.id}`;
                it.day = LocalDate.from(it.dateCreated);
            });
            await this.cube.loadDataAsync(data);
            this.loadGrid();
        } catch (e) {
            this.gridModel.clear();
            XH.handleException(e);
        }
    }

    loadGrid() {
        const dimensions = this.dimChooserModel.value,
            data = this.cube.executeQuery({
                dimensions,
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
        this.detailRecord = rec;
    }

    @action
    closeDetail() {
        this.detailRecord = null;
    }

    //------------------------
    // Implementation
    //------------------------
    getParams() {
        return {
            startDate: this.startDate,
            endDate: this.endDate,
            username: this.username,
            error: this.error
        };
    }

    dateRangeRenderer(range) {
        if (!range) return;
        if (LocalDate.isLocalDate(range)) return fmtDate(range.date);

        const {min, max} = range,
            minStr = fmtDate(min.date),
            maxStr = fmtDate(max.date);

        if (minStr === maxStr) return minStr;
        return `${minStr} – ${maxStr}`;
    }

}