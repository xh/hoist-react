/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel, managed, LoadSupport} from '@xh/hoist/core';
import {action, bindable, observable, comparer} from '@xh/hoist/mobx';
import {GridModel} from '@xh/hoist/cmp/grid';
import {fmtDate, numberRenderer} from '@xh/hoist/format';
import {dateTimeCol} from '@xh/hoist/cmp/grid';
import {usernameCol} from '@xh/hoist/admin/columns';
import {LocalDate} from '@xh/hoist/utils/datetime';

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

    @managed
    gridModel = new GridModel({
        stateModel: 'xhActivityGrid',
        enableColChooser: true,
        enableExport: true,
        exportOptions: {filename: () => `Activity ${fmtDate(this.startDate)} to ${fmtDate(this.endDate)}`},
        emptyText: 'No activity reported...',
        sortBy: 'dateCreated|desc',
        columns: [
            {field: 'severity', width: 100},
            {field: 'dateCreated', ...dateTimeCol},
            {field: 'username', ...usernameCol},
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

    async doLoadAsync(loadSpec) {
        return XH.fetchJson({
            url: 'trackLogAdmin',
            params: this.getParams(),
            loadSpec
        }).then(data => {
            this.gridModel.loadData(data);
        }).catchDefault();
    }

    constructor() {
        this.addReaction({
            track: () => this.getParams(),
            run: () => this.loadAsync(),
            equals: comparer.structural
        });
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
}