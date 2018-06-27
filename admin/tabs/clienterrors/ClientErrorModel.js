/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import moment from 'moment';
import {XH, HoistModel} from '@xh/hoist/core';
import {action, observable, setter} from '@xh/hoist/mobx';
import {LocalStore} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/cmp/grid';
import {fmtDate} from '@xh/hoist/format';
import {baseCol, boolCheckCol} from '@xh/hoist/columns/Core';
import {compactDateCol} from '@xh/hoist/columns/DatesTimes';

import {usernameCol} from '../../columns/Columns';

@HoistModel()
export class ClientErrorModel {

    @observable startDate = moment().subtract(7, 'days').toDate();
    @observable endDate = moment().toDate();
    @observable @setter username = '';
    @observable @setter error = '';

    @observable detailRecord = null;

    gridModel = new GridModel({
        stateModel: 'xhClientErrorGrid',
        enableColChooser: true,
        store: new LocalStore({
            fields: [
                'username', 'error', 'msg', 'userAlerted', 'browser', 'device',
                'appVersion', 'appEnvironment', 'dateCreated', 'userAgent'
            ]
        }),
        sortBy: {colId: 'dateCreated', sort: 'desc'},
        columns: [
            compactDateCol({field: 'dateCreated', fixedWidth: 100, align: 'right'}),
            usernameCol({fixedWidth: 120}),
            baseCol({field: 'error', minWidth: 450, flex: 3}),
            baseCol({field: 'msg', headerName: 'Message', minWidth: 150, flex: 1}),
            boolCheckCol({field: 'userAlerted', headerName: 'User Alerted?', fixedWidth: 120}),
            baseCol({field: 'browser', fixedWidth: 100}),
            baseCol({field: 'device', fixedWidth: 100}),
            baseCol({field: 'appVersion', fixedWidth: 130}),
            baseCol({field: 'appEnvironment', headerName: 'Environment', fixedWidth: 130})
        ]
    });

    async loadAsync() {
        return XH.fetchJson({
            url: 'clientErrorAdmin',
            params: this.getParams()
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
            newStart = today.clone().subtract(diff, 'days');
            newEnd = today;
        }

        this.setStartDate(newStart.toDate());
        this.setEndDate(newEnd.toDate());
        this.loadAsync();
    }

    export() {
        const fileName = `Client Errors: ${fmtDate(this.startDate)} to ${fmtDate(this.endDate)}`;
        this.gridModel.exportDataAsExcel({fileName});
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

    destroy() {
        XH.safeDestroy(this.gridModel);
    }
}