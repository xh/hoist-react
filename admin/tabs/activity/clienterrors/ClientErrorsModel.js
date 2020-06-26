/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {usernameCol} from '@xh/hoist/admin/columns';
import {boolCheckCol, compactDateCol, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {fmtSpan} from '@xh/hoist/format';
import {bindable, comparer} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {LocalDate} from '@xh/hoist/utils/datetime';

@HoistModel
@LoadSupport
export class ClientErrorsModel {

    persistWith = {localStorageKey: 'xhAdminClientErrorsState'};

    @bindable.ref endDate = LocalDate.today();
    @bindable.ref startDate = LocalDate.today().subtract(6, 'months');
    @bindable username = '';
    @bindable error = '';

    get selectedRecord() {return this.gridModel.selectedRecord}

    get formattedErrorJson() {
        let ret = this.selectedRecord?.data?.error;
        if (!ret) return null;
        try {
            ret = JSON.stringify(JSON.parse(ret), null, 2);
        } catch (ignored) {}
        return ret;
    }

    @managed gridModel;

    constructor() {
        this.gridModel = new GridModel({
            persistWith: this.persistWith,
            enableColChooser: true,
            enableExport: true,
            exportOptions: {
                filename: `${XH.appCode}-client-errors`,
                columns: 'ALL'
            },
            emptyText: 'No errors reported...',
            sortBy: 'dateCreated|desc',
            columns: [
                {field: 'dateCreated', ...compactDateCol, width: 140},
                {field: 'username', ...usernameCol},
                {field: 'userAlerted', ...boolCheckCol, headerName: 'Alerted', width: 90},
                {field: 'browser', width: 100},
                {field: 'device', width: 100},
                {field: 'userAgent', width: 130, hidden: true},
                {field: 'appVersion', width: 130},
                {field: 'appEnvironment', headerName: 'Environment', width: 130},
                {field: 'msg', width: 130, hidden: true},
                {field: 'error', flex: true, minWidth: 150, renderer: (e) => fmtSpan(e)}
            ]
        });

        this.addReaction({
            track: () => this.getParams(),
            run: () => this.loadAsync(),
            equals: comparer.structural
        });
    }

    async doLoadAsync(loadSpec) {
        const {gridModel} = this;

        try {
            const data = await XH.fetchJson({
                url: 'clientErrorAdmin',
                params: this.getParams(),
                loadSpec
            });

            gridModel.loadData(data);

            await wait(1);
            if (!gridModel.hasSelection) gridModel.selectFirst();
        } catch (e) {
            gridModel.clear();
            XH.handleException(e);
        }
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
}