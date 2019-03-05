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
import {fmtDate, fmtSpan} from '@xh/hoist/format';
import {boolCheckCol, compactDateCol} from '@xh/hoist/cmp/grid';
import {usernameCol} from '@xh/hoist/admin/columns';

@HoistModel
@LoadSupport
export class ClientErrorModel {

    @observable startDate = moment().subtract(7, 'days').toDate();
    @observable endDate = moment().toDate();
    @observable username = '';
    @observable error = '';

    @observable detailRecord = null;
    
    @managed
    gridModel = new GridModel({
        stateModel: 'xhClientErrorGrid',
        enableColChooser: true,
        enableExport: true,
        exportOptions: {filename: () => `Client Errors ${fmtDate(this.startDate)} to ${fmtDate(this.endDate)}`},
        store: new LocalStore({
            fields: [
                'username', 'error', 'msg', 'userAlerted', 'browser', 'device',
                'appVersion', 'appEnvironment', 'dateCreated', 'userAgent'
            ]
        }),
        sortBy: {colId: 'dateCreated', sort: 'desc'},
        columns: [
            {field: 'dateCreated', ...compactDateCol, width: 140},
            {field: 'username', ...usernameCol},
            {field: 'userAlerted', ...boolCheckCol, headerName: 'Alerted', width: 90},
            {field: 'browser', width: 100},
            {field: 'device', width: 100},
            {field: 'appVersion', width: 130},
            {field: 'appEnvironment', headerName: 'Environment', width: 130},
            {field: 'error', flex: true, minWidth: 150, renderer: (e) => fmtSpan(e)}
        ]
    });

    constructor() {
        this.addReaction({
            track: () => this.getParams(),
            run: this.loadAsync,
            equals: comparer.structural
        });
    }

    async doLoadAsync(loadSpec) {
        return XH.fetchJson({
            url: 'clientErrorAdmin',
            params: this.getParams(),
            loadSpec
        }).then(data => {
            this.gridModel.loadData(data);
        }).catchDefault();
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
    setError(error) {
        this.error = error;
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
            startDate: fmtDate(this.startDate, 'YYYYMMDD'),
            endDate: fmtDate(this.endDate, 'YYYYMMDD'),
            username: this.username,
            error: this.error
        };
    }

    isValidDate(date) {
        return date && date.toString() !== 'Invalid Date';
    }
}