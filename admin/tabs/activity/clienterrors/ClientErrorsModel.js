/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {usernameCol} from '@xh/hoist/admin/columns';
import {FormModel} from '@xh/hoist/cmp/form';
import {dateTimeCol, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {fmtSpan} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, comparer, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {LocalDate} from '@xh/hoist/utils/datetime';

@HoistModel
@LoadSupport
export class ClientErrorsModel {

    persistWith = {localStorageKey: 'xhAdminClientErrorsState'};

    @bindable.ref startDate = LocalDate.today().subtract(6, 'months');
    @bindable.ref endDate = LocalDate.today();
    @bindable username;
    @bindable error;

    /** @member {GridModel} */
    @managed gridModel
    /** @member {FormModel} */
    @managed formModel;

    /** @member {{}} - distinct values for key dimensions, used to power query selects. */
    @bindable.ref lookups = {};

    get selectedRecord() {return this.gridModel.selectedRecord}

    /** @member {string} - parsed and JSON-formatted stacktrace / additional data for selected error. */
    @observable formattedErrorJson;

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
                {
                    field: 'userMessageFlag',
                    headerName: Icon.comment(),
                    headerTooltip: 'Indicates if the user provided a message along with the automated error report.',
                    excludeFromExport: true,
                    resizable: false,
                    align: 'center',
                    width: 50,
                    renderer: (v, {record}) => {
                        const {msg} = record.data;
                        return msg ? Icon.comment({asHtml: true}) : '';
                    }
                },
                {
                    field: 'userAlerted',
                    headerName: Icon.window(),
                    headerTooltip: 'Indicates if the user was shown an interactive alert when this error was triggered.',
                    resizable: false,
                    align: 'center',
                    width: 50,
                    exportName: 'User Alerted?',
                    renderer: v => {
                        return v ? Icon.window({asHtml: true}) : '';
                    }
                },
                {field: 'id', headerName: 'Entry ID', width: 100, align: 'right', hidden: true},
                {field: 'username', ...usernameCol},
                {field: 'browser', width: 100},
                {field: 'device', width: 100},
                {field: 'userAgent', width: 130, hidden: true},
                {field: 'appVersion', width: 130},
                {field: 'appEnvironment', headerName: 'Environment', width: 130},
                {field: 'msg', headerName: 'User Message', width: 130, hidden: true},
                {
                    field: 'error',
                    headerName: 'Error Details',
                    flex: true,
                    minWidth: 150,
                    renderer: (e) => fmtSpan(e, {className: 'xh-font-family-mono xh-font-size-small'})
                },
                {field: 'dateCreated', headerName: 'Timestamp', ...dateTimeCol}
            ]
        });

        this.formModel = new FormModel({
            readonly: true,
            fields: this.gridModel.columns.map(it => ({name: it.field, displayName: it.headerName}))
        });

        this.addReaction({
            track: () => this.getParams(),
            run: () => this.loadAsync(),
            equals: comparer.structural,
            debounce: 100
        });

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: (detailRec) => this.showEntryDetail(detailRec)
        });
    }

    @action
    resetQuery() {
        this.startDate = LocalDate.today().subtract(6, 'months');
        this.endDate = LocalDate.today();
        this.username = null;
        this.error = null;
    }

    async doLoadAsync(loadSpec) {
        const {gridModel} = this;

        try {
            await this.loadLookupsAsync(loadSpec);

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

    async loadLookupsAsync(loadSpec) {
        const lookups = await XH.fetchJson({
            url: 'clientErrorAdmin/lookups',
            loadSpec
        });

        this.setLookups(lookups);
    }

    @action
    showEntryDetail(detailRec) {
        const recData = detailRec?.data ?? {},
            errorData = recData.error;

        this.formModel.init(recData);

        let formattedErrorJson = errorData;
        if (formattedErrorJson) {
            try {
                formattedErrorJson = JSON.stringify(JSON.parse(errorData), null, 2);
            } catch (ignored) {}
        }

        this.formattedErrorJson = formattedErrorJson;
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
    }

    getParams() {
        return {
            startDate: this.startDate,
            endDate: this.endDate,
            username: this.username,
            error: this.error
        };
    }
}