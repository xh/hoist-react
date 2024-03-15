/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilename} from '@xh/hoist/admin/AdminUtils';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {fmtDate, fmtJson} from '@xh/hoist/format';
import {action, bindable, observable, makeObservable, comparer} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import * as Col from '@xh/hoist/admin/columns';
import moment from 'moment';

export class ClientErrorsModel extends HoistModel {
    override persistWith = {localStorageKey: 'xhAdminClientErrorsState'};

    @bindable.ref startDay: LocalDate;
    @bindable.ref endDay: LocalDate;

    @managed gridModel: GridModel;
    @managed formModel: FormModel;
    @managed filterChooserModel: FilterChooserModel;

    get selectedRecord() {
        return this.gridModel.selectedRecord;
    }

    /** Parsed and JSON-formatted stacktrace / additional data for selected error. */
    @observable formattedErrorJson: string;

    constructor() {
        super();
        makeObservable(this);
        this.startDay = this.getDefaultStartDay();
        this.endDay = this.getDefaultEndDay();

        const hidden = true;
        this.gridModel = new GridModel({
            persistWith: this.persistWith,
            colChooserModel: true,
            enableExport: true,
            exportOptions: {
                filename: exportFilename('client-errors'),
                columns: 'ALL'
            },
            emptyText: 'No errors reported...',
            sortBy: 'dateCreated|desc',
            columns: [
                {...Col.userMessageFlag},
                {...Col.userAlertedFlag},
                {...Col.entryId, hidden},
                {...Col.username},
                {...Col.browser},
                {...Col.device},
                {...Col.userAgent, hidden},
                {...Col.appVersion},
                {...Col.appEnvironment},
                {...Col.msg, displayName: 'User Message', hidden},
                {...Col.error, hidden},
                {...Col.url},
                {...Col.day},
                {...Col.dateCreatedWithSec, displayName: 'Timestamp'},
                {...Col.correlationId, hidden}
            ]
        });

        this.filterChooserModel = new FilterChooserModel({
            bind: this.gridModel.store,
            fieldSpecs: [
                'correlationId',
                'username',
                'browser',
                'device',
                'appVersion',
                'appEnvironment',
                'userAlerted',
                {
                    field: 'userAgent',
                    enableValues: false
                },
                {
                    field: 'msg',
                    enableValues: false
                },
                {
                    field: 'error',
                    enableValues: false
                },
                {
                    field: 'url',
                    enableValues: false
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
                    valueRenderer: v => fmtDate(v),
                    ops: ['>', '>=', '<', '<=']
                }
            ],
            persistWith: this.persistWith
        });

        this.formModel = new FormModel({
            readonly: true,
            fields: this.gridModel
                .getLeafColumns()
                .map(it => ({name: it.field, displayName: it.headerName as string}))
        });

        this.addReaction({
            track: () => this.getParams(),
            run: () => this.loadAsync(),
            equals: comparer.structural
        });

        this.addReaction({
            track: () => this.gridModel.selectedRecord,
            run: detailRec => this.showEntryDetail(detailRec)
        });
    }

    @action
    resetQuery() {
        this.startDay = this.getDefaultStartDay();
        this.endDay = this.getDefaultEndDay();
        this.filterChooserModel.setValue(null);
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
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
                formattedErrorJson = fmtJson(errorData);
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
        return {
            startDay: this.startDay,
            endDay: this.endDay
        };
    }

    getDefaultStartDay() {
        return LocalDate.currentAppDay();
    }
    getDefaultEndDay() {
        return LocalDate.currentAppDay();
    }
}
