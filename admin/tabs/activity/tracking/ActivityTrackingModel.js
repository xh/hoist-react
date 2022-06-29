/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel, TreeStyle} from '@xh/hoist/cmp/grid';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {Cube} from '@xh/hoist/data';
import {fmtDate, fmtNumber} from '@xh/hoist/format';
import {action, computed, makeObservable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import * as Col from '@xh/hoist/admin/columns';
import {isEmpty} from 'lodash';
import moment from 'moment';

export const PERSIST_ACTIVITY = {localStorageKey: 'xhAdminActivityState'};

export class ActivityTrackingModel extends HoistModel {

    persistWith = PERSIST_ACTIVITY;

    /** @member {FormModel} */
    @managed formModel;
    /** @member {GroupingChooserModel} */
    @managed groupingChooserModel;
    /** @member {Cube} */
    @managed cube;
    /** @member {FilterChooserModel} */
    @managed filterChooserModel;
    /** @member {GridModel} */
    @managed gridModel;

    get dimensions() {return this.groupingChooserModel.value}

    /**
     * @returns {string} - summary of currently active query / filters.
     *      TODO - include new local filters if feasible, or drop this altogether.
     *          Formerly summarized server-side filters, but was misleading w/new filtering.
     */
    get queryDisplayString() {
        return `${XH.appName} Activity`;
    }

    /** @return {LocalDate} */
    get endDay() {return this.formModel.values.endDay}

    /** @return {number} */
    get maxRows() {return this.formModel.values.maxRows}

    /** @return {boolean} - true if data loaded from the server has been topped by maxRows. */
    @computed
    get maxRowsReached() {
        return this.maxRows === this.cube.store.allCount;
    }

    _monthFormat = 'MMM YYYY';
    _defaultDims = ['day', 'username'];

    constructor() {
        super();
        makeObservable(this);
        this.formModel = new FormModel({
            fields: [
                {name: 'startDay', initialValue: () => this.getDefaultStartDay()},
                {name: 'endDay', initialValue: () => this.getDefaultEndDay()},
                {name: 'maxRows', initialValue: 25000}
            ]
        });
        window.activityModel = this;
        this.cube = new Cube({
            fields: [
                {...Col.browser.field},
                {...Col.category.field},
                {...Col.data.field},
                {...Col.dateCreated.field, displayName: 'Timestamp'},
                {...Col.day.field},
                {...Col.device.field},
                {...Col.elapsed.field},
                {...Col.entryCount.field},
                {...Col.impersonating.field},
                {...Col.msg.field},
                {...Col.userAgent.field},
                {...Col.username.field},

                {name: 'count', type: 'int', aggregator: 'CHILD_COUNT'},
                {name: 'month', type: 'string', isDimension: true, aggregator: 'UNIQUE'}
            ]
        });

        this.groupingChooserModel = new GroupingChooserModel({
            dimensions: this.cube.dimensions,
            persistWith: this.persistWith,
            initialValue: this._defaultDims
        });

        this.filterChooserModel = new FilterChooserModel({
            bind: this.cube.store,
            fieldSpecs: [
                'category',
                'month',
                'username',
                'device',
                'browser',
                'msg',
                'userAgent',
                {
                    field: 'elapsed',
                    valueRenderer: (v) => {
                        return fmtNumber(v, {
                            label: 'ms',
                            formatConfig: {thousandSeparated: false, mantissa: 0}
                        });
                    }
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

        const hidden = true;
        this.gridModel = new GridModel({
            treeMode: true,
            treeStyle: TreeStyle.HIGHLIGHTS_AND_BORDERS,
            persistWith: {
                ...this.persistWith,
                path: 'aggGridModel',
                persistSort: false
            },
            colChooserModel: true,
            enableExport: true,
            exportOptions: {filename: `${XH.appCode}-activity-summary`},
            emptyText: 'No activity reported...',
            sortBy: ['cubeLabel'],
            columns: [
                {
                    field: {
                        name: 'cubeLabel',
                        type: 'string',
                        displayName: 'Tracked Activity'
                    },
                    flex: 1,
                    minWidth: 100,
                    isTreeColumn: true,
                    comparator: this.cubeLabelComparator.bind(this)
                },
                {...Col.username, hidden},
                {...Col.category, hidden},
                {...Col.device, hidden},
                {...Col.browser, hidden},
                {...Col.userAgent, hidden},
                {...Col.impersonating, hidden},
                {...Col.elapsed, headerName: 'Elapsed (avg)', hidden},
                {...Col.dateRange, hidden},
                {...Col.entryCount},
                {field: 'count', hidden}
            ]
        });

        this.addReaction({
            track: () => {
                const vals = this.formModel.values;
                return [vals.startDay, vals.endDay, vals.maxRows];
            },
            run: () => this.loadAsync(),
            debounce: 100
        });

        this.addReaction({
            track: () => [this.cube.records, this.filterChooserModel.value, this.dimensions],
            run: () => this.loadGridAsync(),
            debounce: 100
        });
    }

    async doLoadAsync(loadSpec) {
        const {cube, formModel} = this;

        const params = formModel.getData();

        // TODO - revert formatting when most apps have migrated to Hoist-Core 13
        params.startDay = params.startDay.format('YYYYMMDD');
        params.endDay = params.endDay.format('YYYYMMDD');

        try {
            const data = await XH.fetchJson({
                url: 'trackLogAdmin',
                params,
                loadSpec
            });

            data.forEach(it => {
                it.day = LocalDate.from(it.day);
                it.month = it.day.format(this._monthFormat);
            });

            await cube.loadDataAsync(data);
        } catch (e) {
            await cube.clearAsync();
            XH.handleException(e);
        }
    }

    async loadGridAsync() {
        const {cube, gridModel, dimensions} = this,
            data = cube.executeQuery({
                dimensions,
                filter: this.filterChooserModel.value,
                includeRoot: true,
                includeLeaves: true
            });

        data.forEach(node => this.separateLeafRows(node));
        gridModel.loadData(data);
        await gridModel.preSelectFirstAsync();
    }

    // Cube emits leaves in "children" collection - rename that collection to "leafRows" so we can
    // carry the leaves with the record, but deliberately not show them in the tree grid. We only
    // want the tree grid to show aggregate records.
    separateLeafRows(node) {
        if (isEmpty(node.children)) return;

        const childrenAreLeaves = !node.children[0].children;
        if (childrenAreLeaves) {
            node.leafRows = node.children;
            delete node.children;
        } else {
            node.children.forEach((child) => this.separateLeafRows(child));
        }
    }

    @action
    resetQuery() {
        const {formModel, filterChooserModel, groupingChooserModel, _defaultDims} = this;
        formModel.init();
        filterChooserModel.setValue(null);
        groupingChooserModel.setValue(_defaultDims);
    }

    adjustDates(dir) {
        const {startDay, endDay} = this.formModel.fields,
            appDay = LocalDate.currentAppDay(),
            start = startDay.value,
            end = endDay.value,
            diff = end.diff(start),
            incr = diff + 1;

        let newStart = start[dir](incr),
            newEnd = end[dir](incr);

        if (newEnd > appDay) {
            newStart = appDay.subtract(Math.abs(diff));
            newEnd = appDay;
        }

        startDay.setValue(newStart);
        endDay.setValue(newEnd);
    }

    // Set the start date by taking the end date and pushing back [value] [units] - then pushing
    // forward one day as the day range query is inclusive.
    adjustStartDate(value, unit) {
        this.formModel.setValues({
            startDay: this.endDay.subtract(value, unit).nextDay()
        });
    }

    cubeLabelComparator(valA, valB, sortDir, abs, {recordA, recordB, defaultComparator}) {
        const rawA = recordA?.raw,
            rawB = recordB?.raw,
            sortValA = this.getComparableValForDim(rawA, rawA?.cubeDimension),
            sortValB = this.getComparableValForDim(rawB, rawB?.cubeDimension);

        return defaultComparator(sortValA, sortValB);
    }

    getComparableValForDim(raw, dim) {
        const rawVal = raw ? raw[dim] : null;
        if (rawVal == null) return null;

        switch (dim) {
            // Days are min/max ranges of LocalDates - sort by max date, desc.
            case 'day': return rawVal.max.timestamp * -1;
            // Months are formatted "June 2020" strings - sort desc.
            case 'month': return moment(rawVal, this._monthFormat).valueOf() * -1;
            // Everything else can sort with its natural value.
            default: return rawVal;
        }
    }

    getDefaultStartDay() {return LocalDate.currentAppDay().subtract(6)}
    getDefaultEndDay() {return LocalDate.currentAppDay()}

}
