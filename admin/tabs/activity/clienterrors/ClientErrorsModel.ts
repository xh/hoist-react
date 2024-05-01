/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {exportFilename} from '@xh/hoist/admin/AdminUtils';
import * as Col from '@xh/hoist/admin/columns';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import {fmtJson} from '@xh/hoist/format';
import {action, bindable, comparer, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';

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
        this.startDay = this.defaultStartDay;
        this.endDay = this.defaultEndDay;

        const hidden = true;
        this.gridModel = new GridModel({
            printSupport: true,
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
                {...Col.impersonatingFlag},
                {...Col.username},
                {...Col.browser},
                {...Col.device},
                {...Col.userAgent, hidden},
                {...Col.appVersion},
                {...Col.appEnvironment},
                {...Col.msg, displayName: 'User Message', hidden},
                {...Col.error, hidden},
                {...Col.url},
                {...Col.instance, hidden},
                {...Col.day},
                {...Col.dateCreatedWithSec, displayName: 'Timestamp'},
                {...Col.impersonating, hidden}
            ]
        });

        const enableValues = true;
        this.filterChooserModel = new FilterChooserModel({
            fieldSpecs: [
                {field: 'username', displayName: 'User', enableValues},
                {field: 'browser', enableValues},
                {field: 'device', enableValues},
                {field: 'appVersion'},
                {field: 'appEnvironment', displayName: 'Environment', enableValues},
                {field: 'userAlerted'},
                {field: 'userAgent'},
                {field: 'msg', displayName: 'User Message'},
                {field: 'error'},
                {field: 'url', displayName: 'URL'},
                {field: 'instance'},
                {field: 'impersonating'}
            ]
        });

        this.loadFieldSpecValues();

        this.formModel = new FormModel({
            readonly: true,
            fields: this.gridModel
                .getLeafColumns()
                .map(it => ({name: it.field, displayName: it.headerName as string}))
        });

        this.addReaction({
            track: () => this.query,
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
        this.startDay = this.defaultStartDay;
        this.endDay = this.defaultEndDay;
        this.filterChooserModel.setValue(null);
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {gridModel} = this;

        try {
            const data = await XH.fetchService.postJson({
                url: 'clientErrorAdmin',
                body: this.query,
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
    showEntryDetail(detailRec: StoreRecord) {
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
    adjustDates(dir: 'subtract' | 'add') {
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

    @computed
    private get query() {
        return {
            startDay: this.startDay,
            endDay: this.endDay,
            filters: this.filterChooserModel.value
        };
    }

    private get defaultStartDay() {
        return LocalDate.currentAppDay().subtract(6);
    }

    private get defaultEndDay() {
        return LocalDate.currentAppDay();
    }

    private async loadFieldSpecValues() {
        const lookups = await XH.fetchJson({url: 'clientErrorAdmin/lookups'});

        this.filterChooserModel.fieldSpecs.forEach(spec => {
            const {field} = spec;
            if (lookups[field]) spec.values = lookups[field];
        });
    }
}
