
/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import moment from 'moment';
import {action, observable, setter} from 'hoist/mobx';
import {LocalStore} from 'hoist/data';
import {GridModel} from 'hoist/grid';
import {fmtDate, numberRenderer} from 'hoist/format';

import {baseCol} from 'hoist/columns/Core';
import {dateTimeCol} from 'hoist/columns/DatesTimes';
import {usernameCol} from '../../columns/Columns';

export class ActivityGridModel {

    @observable startDate = moment().toDate();
    @observable endDate = moment().toDate();
    @observable @setter username = '';
    @observable @setter msg = '';
    @observable @setter category = '';
    @observable @setter device = '';
    @observable @setter browser = '';
    @observable @setter detailRecord = null;

    store = new LocalStore({
        fields: [
            'severity', 'dateCreated', 'username', 'msg', 'category',
            'device', 'browser', 'data', 'impersonating', 'elapsed',
            'userAgent'
        ]
    });

    gridModel = new GridModel({
        store: this.store,
        columns: [
            baseCol({field: 'severity', fixedWidth: 90}),
            dateTimeCol({field: 'dateCreated', fixedWidth: 160, align: 'right'}),
            usernameCol({fixedWidth: 120}),
            baseCol({field: 'msg', headerName: 'Message', minWidth: 150, flex: 1}),
            baseCol({field: 'category', fixedWidth: 100}),
            baseCol({field: 'device', fixedWidth: 80}),
            baseCol({field: 'browser', fixedWidth: 100}),
            baseCol({field: 'data', minWidth: 70, flex: 1}),
            baseCol({field: 'impersonating', fixedWidth: 140}),
            baseCol({
                field: 'elapsed',
                headerName: 'Elapsed (ms)',
                fixedWidth: 120,
                valueFormatter: numberRenderer({precision: 0})
            })
        ]
    });

    async loadAsync() {
        return XH.fetchJson({
            url: 'trackLogAdmin',
            params: this.getParams()
        }).then(data => {
            this.store.loadData(data);
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
        const fileName = `Activity: ${fmtDate(this.startDate)} to ${fmtDate(this.endDate)}`;
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