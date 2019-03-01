/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import moment from 'moment';
import {XH, HoistModel, managed, LoadSupport} from '@xh/hoist/core';
import {action, observable, comparer} from '@xh/hoist/mobx';
import {LocalStore} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/cmp/grid';
import {fmtDate, numberRenderer} from '@xh/hoist/format';
import {dateTimeCol} from '@xh/hoist/cmp/grid';
import {usernameCol} from '@xh/hoist/admin/columns';

@HoistModel
@LoadSupport
export class ActivityGridModel {

    @observable startDate = moment().subtract(7, 'days').toDate();
    @observable endDate = moment().add(1, 'days').toDate();  // https://github.com/exhi/hoist-react/issues/400
    @observable username = '';
    @observable msg = '';
    @observable category = '';
    @observable device = '';
    @observable browser = '';

    @observable detailRecord = null;

    @managed
    gridModel = new GridModel({
        stateModel: 'xhActivityGrid',
        enableColChooser: true,
        enableExport: true,
        exportOptions: {filename: () => `Activity ${fmtDate(this.startDate)} to ${fmtDate(this.endDate)}`},
        store: new LocalStore({
            fields: [
                'severity', 'dateCreated', 'username', 'msg', 'category',
                'device', 'browser', 'data', 'impersonating', 'elapsed',
                'userAgent'
            ]
        }),
        sortBy: {colId: 'dateCreated', sort: 'desc'},
        columns: [
            {field: 'severity', width: 100},
            {field: 'dateCreated', ...dateTimeCol},
            {field: 'username', ...usernameCol},
            {field: 'category', width: 100},
            {field: 'device', width: 100},
            {field: 'browser', width: 100},
            {field: 'data', width: 70},
            {field: 'impersonating', width: 140},
            {
                field: 'elapsed',
                headerName: 'Elapsed (ms)',
                width: 130,
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
            run: this.loadAsync,
            equals: comparer.structural
        });
    }

    adjustDates(dir, toToday = false) {
        const today = moment(),
            start = moment(this.startDate),
            end = moment(this.endDate),
            diff = end.diff(start, 'days'),
            incr = diff + 1;

        let newStart = start[dir](incr, 'days'),
            newEnd = end[dir](incr, 'days');

        if (newEnd.diff(today, 'days') > 0 || toToday) {
            newStart = today.clone().subtract(Math.abs(diff), 'days');
            newEnd = today;
        }

        this.setStartDate(newStart.toDate());
        this.setEndDate(newEnd.toDate());
        this.loadAsync();
    }

    @action
    setStartDate(date) {
        if (!this.isValidDate(date) || moment(date).isSame(this.startDate)) return;
        this.startDate = date;
    }

    @action
    setEndDate(date) {
        if (!this.isValidDate(date) || moment(date).isSame(this.endDate)) return;
        this.endDate = date;
    }

    @action
    setUsername(username) {
        this.username = username;
    }

    @action
    setMsg(msg) {
        this.msg = msg;
    }

    @action
    setCategory(category) {
        this.category = category;
    }

    @action
    setDevice(device) {
        this.device = device;
    }

    @action
    setBrowser(browser) {
        this.browser = browser;
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
            startDate: fmtDate(this.startDate, 'YYYYMMDD'),
            endDate: fmtDate(this.endDate, 'YYYYMMDD'),
            username: this.username,
            msg: this.msg,
            category: this.category,
            device: this.device,
            browser: this.browser
        };
    }

    isValidDate(date) {
        return date && date.toString() !== 'Invalid Date';
    }
}