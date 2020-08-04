/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {usernameCol} from '@xh/hoist/admin/columns';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel, dateTimeCol} from '@xh/hoist/cmp/grid';
import {FilterModel} from '@xh/hoist/data';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {fmtDate, fmtSpan} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, comparer, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {LocalDate} from '@xh/hoist/utils/datetime';
import moment from 'moment';

@HoistModel
@LoadSupport
export class ClientErrorsModel {

    persistWith = {localStorageKey: 'xhAdminClientErrorsState'};

    @bindable.ref startDate;
    @bindable.ref endDate;

    /** @member {GridModel} */
    @managed gridModel
    /** @member {FormModel} */
    @managed formModel;
    /** @member {FilterModel} */
    @managed filterModel;
    /** @member {FilterChooserModel} */
    @managed filterChooserModel;

    get selectedRecord() {return this.gridModel.selectedRecord}

    /** @member {string} - parsed and JSON-formatted stacktrace / additional data for selected error. */
    @observable formattedErrorJson;

    constructor() {
        this.startDate = this.getDefaultStartDate();
        this.endDate = this.getDefaultEndDate();

        this.filterModel = new FilterModel();

        this.gridModel = new GridModel({
            persistWith: this.persistWith,
            enableColChooser: true,
            enableExport: true,
            store: {
                filterModel: this.filterModel,
                fields: [
                    {name: 'username', type: 'string'},
                    {name: 'browser', type: 'string'},
                    {name: 'device', type: 'string'},
                    {name: 'userAgent', type: 'string'},
                    {name: 'appVersion', type: 'string'},
                    {name: 'appEnvironment', type: 'string'},
                    {name: 'msg', type: 'string'},
                    {name: 'error', type: 'string'},
                    {name: 'dateCreated', type: 'date'},
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

        this.filterChooserModel = new FilterChooserModel({
            filterModel: this.filterModel,
            filterOptionsModel: {
                store: this.gridModel.store,
                fields: [
                    'username',
                    'browser',
                    'device',
                    'appVersion',
                    'userAlerted',
                    {
                        field: 'userAgent',
                        operators: ['like']
                    },
                    {
                        field: 'appEnvironment',
                        displayName: 'Environment'
                    },
                    {
                        field: 'msg',
                        displayName: 'User Message',
                        operators: ['like']
                    },
                    {
                        field: 'error',
                        displayName: 'Error Details',
                        operators: ['like']
                    },
                    {
                        field: 'dateCreated',
                        displayName: 'Timestamp',
                        exampleValue: Date.now(),
                        valueParser: (v, operator) => {
                            let ret = moment(v, ['YYYY-MM-DD', 'YYYYMMDD'], true);
                            if (!ret.isValid()) return null;

                            // Note special handling for '>' & '<=' queries.
                            if (['>', '<='].includes(operator)) {
                                ret = moment(ret).endOf('day');
                            }

                            return ret.toDate();
                        },
                        valueRenderer: (v) => fmtDate(v),
                        operators: ['>', '>=', '<', '<=']
                    }
                ]
            },
            persistWith: this.persistWith
        });

        this.formModel = new FormModel({
            readonly: true,
            fields: this.gridModel.columns.map(it => ({name: it.field, displayName: it.headerName}))
        });

        this.addReaction({
            track: () => this.getParams(),
            run: () => this.loadAsync(),
            equals: comparer.structural
        });

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: (detailRec) => this.showEntryDetail(detailRec)
        });
    }

    @action
    resetQuery() {
        this.startDate = this.getDefaultStartDate();
        this.endDate = this.getDefaultEndDate();
        this.filterModel.clear();
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
        const tomorrow = LocalDate.tomorrow(),
            start = this.startDate,
            end = this.endDate,
            diff = end.diff(start),
            incr = diff + 1;

        let newStart = start[dir](incr),
            newEnd = end[dir](incr);

        if (newEnd > tomorrow) {
            newStart = tomorrow.subtract(Math.abs(diff));
            newEnd = tomorrow;
        }

        this.startDate = newStart;
        this.endDate = newEnd;
    }

    getParams() {
        const {startDate, endDate} = this;
        return {startDate, endDate};
    }

    // TODO - see https://github.com/xh/hoist-react/issues/400 for why we push endDate out to tomorrow.
    getDefaultStartDate() {return LocalDate.today().subtract(1, 'months')}
    getDefaultEndDate() {return LocalDate.tomorrow()}

}