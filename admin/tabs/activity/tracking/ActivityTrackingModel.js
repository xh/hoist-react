/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {usernameCol} from '@xh/hoist/admin/columns';
import {ActivityDetailModel} from '@xh/hoist/admin/tabs/activity/tracking/detail/ActivityDetailModel';
import {DimensionChooserModel} from '@xh/hoist/cmp/dimensionchooser';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {FilterModel, Cube} from '@xh/hoist/data';
import {FilterFieldModel} from '@xh/hoist/cmp/filter';
import {fmtDate, numberRenderer} from '@xh/hoist/format';
import {action, bindable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {compact, isEmpty, isFinite} from 'lodash';
import moment from 'moment';

import {ChildCountAggregator, LeafCountAggregator, RangeAggregator} from '../aggregators';
import {ChartsModel} from './charts/ChartsModel';

export const PERSIST_ACTIVITY = {localStorageKey: 'xhAdminActivityState'};

@HoistModel
@LoadSupport
export class ActivityTrackingModel {

    persistWith = PERSIST_ACTIVITY;

    /** @member {FormModel} */
    @managed formModel;
    /** @member {DimensionChooserModel} */
    @managed dimChooserModel;
    /** @member {Cube} */
    @managed cube;
    /** @member {FilterModel} */
    @managed filterModel;
    /** @member {FilterFieldModel} */
    @managed filterFieldModel;
    /** @member {GridModel} */
    @managed gridModel;

    /** @member {ActivityDetailModel} */
    @managed activityDetailModel;
    /** @member {ChartsModel} */
    @managed chartsModel;

    /** @member {{}} - distinct values for key dimensions, used to power query selects. */
    @bindable.ref lookups = {};

    get dimensions() {return this.dimChooserModel.value}

    /** @returns {string} - summary of overall query. */
    get queryDisplayString() {
        const {formModel} = this,
            vals = formModel.values,
            parts = [
                `${XH.appName} Activity`,
                vals.category ? `${vals.category} Category` : null,
                this.dateRangeRenderer({min: vals.startDate, max: vals.endDate}),
                vals.username,
                vals.device,
                vals.browser,
                vals.msg ? `"${vals.msg}"` : null
            ];

        return compact(parts).join(' · ');
    }

    _monthFormat = 'MMM YYYY';
    _defaultDims = ['day', 'username'];

    constructor() {
        this.formModel = new FormModel({
            fields: [
                {name: 'category'},
                {name: 'startDate', initialValue: LocalDate.today().subtract(6, 'months')},
                // TODO - see https://github.com/xh/hoist-react/issues/400 for why we push endDate out to tomorrow.
                {name: 'endDate', initialValue: LocalDate.today().add(1)}
            ]
        });

        this.dimChooserModel = new DimensionChooserModel({
            persistWith: this.persistWith,
            dimensions: [
                {label: 'Date', value: 'day'},
                {label: 'Month', value: 'month'},
                {label: 'User', value: 'username'},
                {label: 'Message', value: 'msg'},
                {label: 'Category', value: 'category'},
                {label: 'Device', value: 'device'},
                {label: 'Browser', value: 'browser'},
                {label: 'User Agent', value: 'userAgent'}
            ],
            initialValue: this._defaultDims
        });

        this.cube = new Cube({
            fields: [
                {name: 'day', type: 'localDate', isDimension: true, aggregator: new RangeAggregator()},
                {name: 'month', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'username', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'msg', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'category', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'device', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'browser', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'userAgent', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'elapsed', type: 'int', aggregator: 'AVG'},
                {name: 'impersonating', type: 'bool'},
                {name: 'dateCreated', type: 'date'},
                {name: 'data', type: 'json'},
                {name: 'count', type: 'int', aggregator: new ChildCountAggregator()},
                {name: 'entryCount', type: 'int', aggregator: new LeafCountAggregator()}
            ]
        });

        this.filterModel = new FilterModel();

        this.filterFieldModel = new FilterFieldModel({
            filterModel: this.filterModel,
            filterOptionsModel: {source: this.cube},
            persistWith: this.persistWith
        });

        this.gridModel = new GridModel({
            treeMode: true,
            persistWith: {
                ...this.persistWith,
                path: 'aggGridModel',
                persistSort: false
            },
            enableColChooser: true,
            enableExport: true,
            exportOptions: {filename: `${XH.appCode}-activity-summary`},
            emptyText: 'No activity reported...',
            sortBy: ['cubeLabel'],
            columns: [
                {
                    field: 'cubeLabel',
                    headerName: 'Tracked Activity',
                    flex: 1,
                    minWidth: 100,
                    isTreeColumn: true,
                    renderer: (v, params) => params.record.raw.cubeDimension === 'day' ? fmtDate(v) : v,
                    comparator: this.cubeLabelComparator.bind(this)
                },
                {field: 'username', ...usernameCol, hidden: true},
                {field: 'category', width: 100, hidden: true},
                {field: 'device', width: 100, hidden: true},
                {field: 'browser', width: 100, hidden: true},
                {field: 'userAgent', width: 100, hidden: true},
                {field: 'impersonating', width: 140, hidden: true},
                {
                    field: 'elapsed',
                    headerName: 'Elapsed (avg)',
                    width: 130,
                    align: 'right',
                    renderer: numberRenderer({label: 'ms', nullDisplay: '-', formatConfig: {thousandSeparated: false, mantissa: 0}}),
                    hidden: true
                },
                {
                    field: 'day',
                    width: 200,
                    align: 'right',
                    headerName: 'Date Range',
                    renderer: this.dateRangeRenderer,
                    exportValue: this.dateRangeRenderer,
                    comparator: this.dateRangeComparator.bind(this),
                    hidden: true
                },
                {field: 'entryCount', headerName: 'Entries', width: 70, align: 'right'}
            ]
        });

        this.activityDetailModel = new ActivityDetailModel({parentModel: this});
        this.chartsModel = new ChartsModel({parentModel: this});

        this.addReaction({
            track: () => {
                const vals = this.formModel.values;
                return [vals.category, vals.startDate, vals.endDate];
            },
            run: () => this.loadAsync(),
            fireImmediately: true,
            debounce: 100
        });

        this.addReaction({
            track: () => [this.cube.records, this.filterModel.filters, this.dimensions],
            run: () => this.loadGridAndChartAsync(),
            debounce: 100
        });
    }

    async doLoadAsync(loadSpec) {
        const {cube, formModel} = this;
        try {
            await this.loadLookupsAsync(loadSpec);

            const data = await XH.fetchJson({
                url: 'trackLogAdmin',
                params: formModel.getData(),
                loadSpec
            });

            data.forEach(it => {
                it.day = LocalDate.from(it.dateCreated);
                it.month = it.day.format(this._monthFormat);
            });

            await cube.loadDataAsync(data);
        } catch (e) {
            await cube.clearAsync();
            XH.handleException(e);
        }
    }

    // Load lookups for query selects to which we wish to provide the set of available values.
    // Will also default the category field to the special "App" value (used within Hoist init() to
    // track application visits / load times).
    async loadLookupsAsync(loadSpec) {
        const {formModel} = this,
            categoryField = formModel.fields.category,
            isFirstLookupLoad = isEmpty(this.lookups);

        const lookups = await XH.fetchJson({
            url: 'trackLogAdmin/lookups',
            loadSpec
        });

        this.setLookups(lookups);

        const {categories} = this.lookups;
        if (isFirstLookupLoad && categories.includes('App') && !categoryField.value) {
            categoryField.setValue('App');
        }
    }

    async loadGridAndChartAsync() {
        const {cube, gridModel, chartsModel, dimensions} = this,
            data = cube.executeQuery({
                dimensions,
                filters: this.filterModel.filters,
                includeLeaves: true
            });

        data.forEach(node => this.separateLeafRows(node));
        gridModel.loadData(data);

        await wait(1);
        if (!gridModel.hasSelection) gridModel.selectFirst();

        chartsModel.setDataAndDims({data, dimensions});
    }

    // Cube emits leaves in "children" collection - rename that collection to "leafRows" so we can
    // carry the leaves with the record, but deliberately not show them in the tree grid. We only
    // want the tree grid to show aggregate records.
    separateLeafRows(node) {
        if (!node.children) return;

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
        const {formModel, dimChooserModel, lookups, _defaultDims} = this;
        formModel.reset();
        if (lookups?.categories?.includes('App')) {
            formModel.fields.category.setValue('App');
        }

        dimChooserModel.setValue(_defaultDims);
    }

    adjustDates(dir, toToday = false) {
        const {startDate, endDate} = this.formModel.fields,
            today = LocalDate.today(),
            start = startDate.value,
            end = endDate.value,
            diff = end.diff(start),
            incr = diff + 1;

        let newStart = start[dir](incr),
            newEnd = end[dir](incr);

        if (newEnd.diff(today) > 0 || toToday) {
            newStart = today.subtract(Math.abs(diff));
            newEnd = today;
        }

        startDate.setValue(newStart);
        endDate.setValue(newEnd);
    }

    toggleRowExpandCollapse(agParams) {
        const {data, node} = agParams;
        if (data?.children && node) node.setExpanded(!node.expanded);
    }

    dateRangeRenderer(range) {
        if (!range) return;
        if (isFinite(range)) return fmtDate(range);

        const {min, max} = range,
            minStr = fmtDate(min),
            maxStr = fmtDate(max);

        if (minStr === maxStr) return minStr;
        return `${minStr} → ${maxStr}`;
    }

    dateRangeComparator(rangeA, rangeB, sortDir, abs, {defaultComparator}) {
        const maxA = rangeA?.max,
            maxB = rangeB?.max;

        return defaultComparator(maxA, maxB);
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

}