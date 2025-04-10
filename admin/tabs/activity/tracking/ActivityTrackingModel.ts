/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {exportFilename} from '@xh/hoist/admin/AdminUtils';
import * as Col from '@xh/hoist/admin/columns';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel, TreeStyle} from '@xh/hoist/cmp/grid';
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {HoistModel, LoadSpec, managed, XH} from '@xh/hoist/core';
import {Cube, CubeFieldSpec, FieldSpec} from '@xh/hoist/data';
import {fmtNumber} from '@xh/hoist/format';
import {action, computed, makeObservable} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {compact, isEmpty, round} from 'lodash';
import moment from 'moment';

export const PERSIST_ACTIVITY = {localStorageKey: 'xhAdminActivityState'};

export class ActivityTrackingModel extends HoistModel {
    override persistWith = PERSIST_ACTIVITY;

    @managed formModel: FormModel;
    @managed groupingChooserModel: GroupingChooserModel;
    @managed cube: Cube;
    @managed filterChooserModel: FilterChooserModel;
    @managed gridModel: GridModel;

    get enabled(): boolean {
        return XH.trackService.enabled;
    }

    get dimensions(): string[] {
        return this.groupingChooserModel.value;
    }

    /**
     * Summary of currently active query / filters.
     * TODO - include new local filters if feasible, or drop this altogether.
     * Formerly summarized server-side filters, but was misleading w/new filtering.
     */
    get queryDisplayString(): string {
        return `${XH.appName} Activity`;
    }

    get endDay(): LocalDate {
        return this.formModel.values.endDay;
    }

    get maxRowOptions() {
        return (
            XH.trackService.conf.maxRows?.options?.map(rowCount => ({
                value: rowCount,
                label: `${round(rowCount / 1000, 1)}k`
            })) ?? []
        );
    }

    get maxRows(): number {
        return this.formModel.values.maxRows;
    }

    /** True if data loaded from the server has been topped by maxRows. */
    @computed
    get maxRowsReached(): boolean {
        return this.maxRows === this.cube.store.allCount;
    }

    private _monthFormat = 'MMM YYYY';
    private _defaultDims = ['username'];

    constructor() {
        super();
        makeObservable(this);
        this.formModel = new FormModel({
            fields: [
                {name: 'startDay', initialValue: () => this.defaultStartDay},
                {name: 'endDay', initialValue: () => this.defaultEndDay},
                {name: 'maxRows', initialValue: XH.trackService.conf.maxRows?.default}
            ]
        });

        this.cube = new Cube({
            fields: [
                Col.browser.field,
                Col.category.field,
                Col.severity.field,
                Col.correlationId.field,
                Col.data.field,
                {...(Col.dateCreated.field as FieldSpec), displayName: 'Timestamp'},
                Col.day.field,
                Col.dayRange.field,
                Col.device.field,
                Col.elapsed.field,
                Col.entryCount.field,
                Col.impersonating.field,
                Col.msg.field,
                Col.userAgent.field,
                Col.username.field,
                {name: 'count', type: 'int', aggregator: 'CHILD_COUNT'},
                {name: 'month', type: 'string', isDimension: true, aggregator: 'UNIQUE'},
                Col.url.field,
                Col.instance.field,
                Col.appVersion.field,
                Col.appEnvironment.field
            ] as CubeFieldSpec[]
        });

        this.filterChooserModel = new FilterChooserModel({
            fieldSpecs: [
                {field: 'category'},
                {field: 'correlationId'},
                {field: 'username', displayName: 'User'},
                {field: 'device'},
                {field: 'browser'},
                {
                    field: 'elapsed',
                    valueRenderer: v => {
                        return fmtNumber(v, {
                            label: 'ms',
                            formatConfig: {thousandSeparated: false, mantissa: 0}
                        });
                    },
                    fieldType: 'number'
                },
                {field: 'msg', displayName: 'Message'},
                {field: 'data'},
                {field: 'userAgent'},
                {field: 'url', displayName: 'URL'},
                {field: 'instance'},
                {field: 'severity'},
                {field: 'appVersion'},
                {field: 'appEnvironment', displayName: 'Environment'}
            ]
        });

        this.loadLookupsAsync();

        this.groupingChooserModel = new GroupingChooserModel({
            dimensions: this.cube.dimensions,
            persistWith: this.persistWith,
            initialValue: this._defaultDims
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
            exportOptions: {filename: exportFilename('activity-summary')},
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
                {...Col.dayRange, hidden},
                {...Col.entryCount},
                {field: 'count', hidden},
                {...Col.appEnvironment, hidden},
                {...Col.appVersion, hidden},
                {...Col.url, hidden},
                {...Col.instance, hidden}
            ]
        });

        this.addReaction({
            track: () => this.query,
            run: () => this.loadAsync(),
            debounce: 100
        });

        this.addReaction({
            track: () => [this.cube.records, this.dimensions],
            run: () => this.loadGridAsync(),
            debounce: 100
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {enabled, cube} = this;
        if (!enabled) return;

        try {
            const data = await XH.fetchService.postJson({
                url: 'trackLogAdmin',
                body: this.query,
                loadSpec
            });

            data.forEach(it => {
                it.day = LocalDate.from(it.day);
                it.month = it.day.format(this._monthFormat);
                it.dayRange = {min: it.day, max: it.day};
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
            node.children.forEach(child => this.separateLeafRows(child));
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

    isInterval(value, unit) {
        const {startDay, endDay} = this.formModel.values;
        return startDay === endDay.subtract(value, unit).nextDay();
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
            // Sort date desc by default
            case 'day':
                return rawVal.timestamp * -1;
            // Months are formatted "June 2020" strings - sort desc.
            case 'month':
                return moment(rawVal, this._monthFormat).valueOf() * -1;
            // Everything else can sort with its natural value.
            default:
                return rawVal;
        }
    }

    private get defaultStartDay() {
        return LocalDate.currentAppDay();
    }

    private get defaultEndDay() {
        return LocalDate.currentAppDay();
    }

    private async loadLookupsAsync() {
        try {
            const lookups = await XH.fetchJson({url: 'trackLogAdmin/lookups'});
            this.filterChooserModel.fieldSpecs.forEach(spec => {
                const {field} = spec,
                    lookup = lookups[field] ? compact(lookups[field]) : null;

                if (!isEmpty(lookup)) {
                    spec.values = lookup;
                    spec.enableValues = true;
                    spec.hasExplicitValues = true;
                }
            });
        } catch (e) {
            XH.handleException(e, {title: 'Error loading lookups for filtering'});
        }
    }

    @computed
    private get query() {
        const {values} = this.formModel;
        return {
            startDay: values.startDay,
            endDay: values.endDay,
            maxRows: values.maxRows,
            filters: this.filterChooserModel.value
        };
    }
}
