/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {usernameCol} from '@xh/hoist/admin/columns';
import {ActivityDetailModel} from '@xh/hoist/admin/tabs/activity/tracking/detail/ActivityDetailModel';
import {DimensionChooserModel} from '@xh/hoist/cmp/dimensionchooser';
import {FilterChooserModel} from '@xh/hoist/cmp/filter';
import {FormModel} from '@xh/hoist/cmp/form';
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, LoadSupport, managed, XH} from '@xh/hoist/core';
import {Cube} from '@xh/hoist/data';
import {fmtDate, fmtNumber, numberRenderer} from '@xh/hoist/format';
import {action} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {isFinite} from 'lodash';
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
    /** @member {FilterChooserModel} */
    @managed filterChooserModel;
    /** @member {GridModel} */
    @managed gridModel;

    /** @member {ActivityDetailModel} */
    @managed activityDetailModel;
    /** @member {ChartsModel} */
    @managed chartsModel;

    get dimensions() {return this.dimChooserModel.value}

    /**
     * @returns {string} - summary of currently active query / filters.
     *      TODO - include new local filters if feasible, or drop this altogether.
     *          Formerly summarized server-side filters, but was misleading w/new filtering.
     */
    get queryDisplayString() {
        return `${XH.appName} Activity`;
    }

    get endDate() {return this.formModel.values.endDate}

    _monthFormat = 'MMM YYYY';
    _defaultDims = ['day', 'username'];
    _defaultFilter = [{field: 'category', value: 'App'}]

    constructor() {
        this.formModel = new FormModel({
            fields: [
                {name: 'startDate', initialValue: this.getDefaultStartDate()},
                {name: 'endDate', initialValue: this.getDefaultEndDate()}
            ]
        });

        this.cube = new Cube({
            fields: [
                {name: 'day', type: 'localDate', isDimension: true, aggregator: new RangeAggregator()},
                {name: 'month', type: 'string', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'username', displayName: 'User', type: 'string', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'msg', displayName: 'Message', type: 'string', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'category', type: 'string', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'device', type: 'string', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'browser', type: 'string', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'userAgent', type: 'string', isDimension: true, aggregator: 'UNIQUE'},
                {name: 'elapsed', type: 'int', aggregator: 'AVG'},
                {name: 'impersonating', type: 'bool'},
                {name: 'dateCreated', displayName: 'Timestamp', type: 'date'},
                {name: 'data', type: 'json'},
                {name: 'count', type: 'int', aggregator: new ChildCountAggregator()},
                {name: 'entryCount', type: 'int', aggregator: new LeafCountAggregator()}
            ]
        });

        this.dimChooserModel = new DimensionChooserModel({
            dimensions: this.cube.dimensions,
            persistWith: this.persistWith,
            initialValue: this._defaultDims
        });

        this.filterChooserModel = new FilterChooserModel({
            initialValue: this._defaultFilter,
            store: this.cube.store,
            fieldSpecs: [
                'category',
                'month',
                'username',
                'device',
                'browser',
                {
                    field: 'msg',
                    suggestValues: false
                },
                {
                    field: 'userAgent',
                    suggestValues: false
                },
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
                    exampleValue: Date.now(),
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
                return [vals.startDate, vals.endDate];
            },
            run: () => this.loadAsync(),
            debounce: 100
        });

        this.addReaction({
            track: () => [this.cube.records, this.filterChooserModel.value, this.dimensions],
            run: () => this.loadGridAndChartAsync(),
            debounce: 100
        });
    }

    async doLoadAsync(loadSpec) {
        const {cube, formModel} = this;
        try {
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

    async loadGridAndChartAsync() {
        const {cube, gridModel, chartsModel, dimensions} = this,
            data = cube.executeQuery({
                dimensions,
                filter: this.filterChooserModel.filter,
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
        const {formModel, filterChooserModel, dimChooserModel, _defaultDims, _defaultFilter} = this;
        formModel.init({
            startDate: this.getDefaultStartDate(),
            endDate: this.getDefaultEndDate()
        });
        filterChooserModel.setFilter(_defaultFilter);
        dimChooserModel.setValue(_defaultDims);
    }

    adjustDates(dir) {
        const {startDate, endDate} = this.formModel.fields,
            tomorrow = LocalDate.tomorrow(),
            start = startDate.value,
            end = endDate.value,
            diff = end.diff(start),
            incr = diff + 1;

        let newStart = start[dir](incr),
            newEnd = end[dir](incr);

        if (newEnd > tomorrow) {
            newStart = tomorrow.subtract(Math.abs(diff));
            newEnd = tomorrow;
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

    // TODO - see https://github.com/xh/hoist-react/issues/400 for why we push endDate out to tomorrow.
    getDefaultStartDate() {return LocalDate.today().subtract(1, 'months')}
    getDefaultEndDate() {return LocalDate.tomorrow()}

}