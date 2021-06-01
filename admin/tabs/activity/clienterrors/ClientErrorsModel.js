/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {usernameCol} from '@xh/hoist/admin/columns';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {FormModel} from '@xh/hoist/cmp/form';
import {dateTimeCol, localDateCol, GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {fmtDate, fmtSpan} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, observable, makeObservable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import moment from 'moment';

export class ClientErrorsModel extends HoistModel {

    persistWith = {localStorageKey: 'xhAdminClientErrorsState'};

    /** @member {LocalDate} */
    @bindable.ref startDay;
    /** @member {LocalDate} */
    @bindable.ref endDay;

    /** @member {GridModel} */
    @managed gridModel;
    /** @member {FormModel} */
    @managed formModel;
    /** @member {FilterChooserModel} */
    @managed filterChooserModel;

    get selectedRecord() {return this.gridModel.selectedRecord}

    /** @member {string} - parsed and JSON-formatted stacktrace / additional data for selected error. */
    @observable formattedErrorJson;

    constructor() {
        super();
        makeObservable(this);
        this.startDay = this.getDefaultStartDay();
        this.endDay = this.getDefaultEndDay();

        this.gridModel = new GridModel({
            persistWith: this.persistWith,
            colChooserModel: true,
            enableExport: true,
            store: {
                fields: [
                    {name: 'username', type: 'string'},
                    {name: 'browser', type: 'string'},
                    {name: 'device', type: 'string'},
                    {name: 'userAgent', type: 'string'},
                    {name: 'appVersion', type: 'string'},
                    {name: 'appEnvironment', displayName: 'Environment', type: 'string'},
                    {name: 'msg', displayName: 'User Message', type: 'string'},
                    {name: 'error', displayName: 'Error Details', type: 'string'},
                    {name: 'dateCreated', displayName: 'Timestamp', type: 'date'},
                    {name: 'day', displayName: 'App Day', type: 'localDate'},
                    {name: 'userAlerted', type: 'bool'}
                ]
            },
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
                    renderer: v => v ? Icon.window({asHtml: true}) : ''
                },
                {field: 'id', headerName: 'Entry ID', width: 100, align: 'right', hidden: true},
                {field: 'username', ...usernameCol},
                {field: 'browser', width: 100},
                {field: 'device', width: 100},
                {field: 'userAgent', width: 130, hidden: true},
                {field: 'appVersion', width: 130},
                {field: 'appEnvironment',  width: 130},
                {field: 'msg', width: 130, hidden: true},
                {
                    field: 'error',
                    flex: true,
                    minWidth: 150,
                    renderer: (e) => fmtSpan(e, {className: 'xh-font-family-mono xh-font-size-small'})
                },
                {field: 'dateCreated', ...dateTimeCol},
                {field: 'day',  ...localDateCol}
            ]
        });

        this.filterChooserModel = new FilterChooserModel({
            sourceStore: this.gridModel.store,
            targetStore: this.gridModel.store,
            fieldSpecs: [
                'username',
                'browser',
                'device',
                'appVersion',
                'appEnvironment',
                'userAlerted',
                {
                    field: 'userAgent',
                    suggestValues: false
                },
                {
                    field: 'msg',
                    suggestValues: false
                },
                {
                    field: 'error',
                    suggestValues: false
                },
                {
                    field: 'dateCreated',
                    example: 'YYYY-MM-DD',
                    valueParser: (v, op) => {
                        let ret = moment(v, ['YYYY-MM-DD', 'YYYYMMDD'], true);
                        if (!ret.isValid()) return null;

                        // Note special handling for '>' & '<=' queries.
                        if (['>', '<='].includes(op)) {
                            ret = moment(ret).endOf('day');
                        }

                        return ret.toDate();
                    },
                    valueRenderer: (v) => fmtDate(v),
                    ops: ['>', '>=', '<', '<=']
                }
            ],
            persistWith: this.persistWith
        });

        this.formModel = new FormModel({
            readonly: true,
            fields: this.gridModel.columns.map(it => ({name: it.field, displayName: it.headerName}))
        });

        this.addReaction({
            track: () => this.getParams(),
            run: () => this.loadAsync(),
            equals: 'structural'
        });

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: (detailRec) => this.showEntryDetail(detailRec)
        });
    }

    @action
    resetQuery() {
        this.startDay = this.getDefaultStartDay();
        this.endDay = this.getDefaultEndDay();
        this.filterChooserModel.setValue(null);
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
            await gridModel.preSelectFirstAsync();

        } catch (e) {
            gridModel.clear();
            XH.handleException(e);
        }
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

    @action
    adjustDates(dir) {
        const appDay = LocalDate.currentAppDay(),
            start = this.startDay,
            end = this.endDay,
            diff = end.diff(start),
            incr = diff + 1;

        let newStart = start[dir](incr),
            newEnd = end[dir](incr);

        if (newEnd > appDay) {
            newStart = appDay.subtract(Math.abs(diff));
            newEnd = appDay;
        }

        this.startDay = newStart;
        this.endDay = newEnd;
    }

    // Set the start date by taking the end date and pushing back [value] [units] - then pushing
    // forward one day as the day range query is inclusive.
    @action
    adjustStartDate(value, unit) {
        this.startDay = this.endDay.subtract(value, unit).nextDay();
    }

    getParams() {
        const {startDay, endDay} = this;
        return {startDay, endDay};
    }

    getDefaultStartDay() {return LocalDate.currentAppDay()}
    getDefaultEndDay() {return LocalDate.currentAppDay()}
}
