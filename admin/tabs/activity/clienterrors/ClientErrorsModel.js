/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {fmtDate} from '@xh/hoist/format';
import {action, bindable, observable, makeObservable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {
    appEnvironmentCol,
    appVersionCol,
    browserCol,
    dateCreatedCol,
    dayCol,
    deviceCol,
    entryIdCol,
    errorCol,
    msgCol,
    urlCol,
    userAgentCol,
    userAlertedFlagCol,
    userMessageFlagCol,
    usernameCol
} from '@xh/hoist/admin/columns';
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
            exportOptions: {
                filename: `${XH.appCode}-client-errors`,
                columns: 'ALL'
            },
            emptyText: 'No errors reported...',
            sortBy: 'dateCreated|desc',
            columns: [
                {...userMessageFlagCol},
                {...userAlertedFlagCol},
                {...entryIdCol, hidden: true},
                {...usernameCol},
                {...browserCol},
                {...deviceCol},
                {...userAgentCol, hidden: true},
                {...appVersionCol},
                {...appEnvironmentCol},
                {...msgCol, displayName: 'User Message', hidden: true},
                {...errorCol},
                {...urlCol},
                {...dateCreatedCol, displayName: 'Timestamp'},
                {...dayCol}
            ]
        });

        this.filterChooserModel = new FilterChooserModel({
            bind: this.gridModel.store,
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
                    field: 'url',
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

    getDefaultStartDay() {return LocalDate.currentAppDay().subtract(6)}
    getDefaultEndDay() {return LocalDate.currentAppDay()}
}
