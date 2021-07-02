/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {FieldFilter, parseFilter} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/cmp/grid';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {castArray, compact, clone, isEmpty, isEqual, uniq} from 'lodash';

export class EnumFilterTabModel extends HoistModel {
    /** @member {ColumnHeaderFilterModel} */
    parentModel;

    /**
     * @member {GridModel} - Checkbox grid to display enumerated set of values
     */
    @managed @observable.ref gridModel;

    /**
     * @member {String[]} List of all (i.e. including hidden) values to display in the grid
     */
    @observable.ref allValues = [];

    /**
     * @member {String[]} List of all available (i.e. excluding hidden) values to display in the grid
     */
    @observable.ref availableValues = [];

    /**
     * @member {Object} Key-value pairs of enumerated value to boolean, indicating whether value is
     * checked/unchecked (i.e. included in '=' `FieldFilter`)
     */
    @observable.ref pendingValue = {};

    @bindable filterText = null; // Bound search term for `StoreFilterField`
    @observable hasHiddenValues = false; // Are values hidden due to filters on other columns?

    /**
     * @member {Object} - FieldFilter config output by this model
     */
    @computed.struct
    get filter() {
        const {allValues, field} = this,
            values = this.getValueList();

        if (isEqual(allValues, values)) return null;

        return {
            field: field,
            op: '=',
            value: values.length === 1 ? values[0] : values
        };
    }

    @computed
    get allVisibleRecsChecked() {
        if (!this.gridModel) return false;

        const {records} = this.gridModel.store;
        if (isEmpty(records)) return false;

        const isChecked = records[0].data.isChecked;
        for (let record of records) {
            if (record.data.isChecked !== isChecked) return null;
        }
        return isChecked;
    }

    get field() {
        return this.parentModel.field;
    }

    get fieldSpec() {
        return this.parentModel.fieldSpec;
    }

    get currentFilter() {
        return this.parentModel.currentFilter;
    }

    get columnFilters() {
        return this.parentModel.columnFilters;
    }

    get valueSource() {
        return this.parentModel.valueSource;
    }

    constructor(parentModel) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;
        this.gridModel = this.createGridModel();

        this.addReaction({
            track: () => [this.availableValues, this.pendingValue],
            run: () => this.syncGrid()
        });
    }

    syncWithFilter() {
        this.doSyncWithFilter();
    }

    @action
    reset() {
        this.doReset();
    }

    @action
    toggleNode(isChecked, value) {
        this.pendingValue = {
            ...this.pendingValue,
            [value]: isChecked
        };
    }

    @action
    toggleBulk(isChecked) {
        const {records} = this.gridModel.store,
            newValue = clone(this.pendingValue);
        for (let rec of records) {
            newValue[rec.id] = isChecked;
        }
        this.pendingValue = newValue;
    }

    //-------------------
    // Implementation
    //-------------------
    @action
    doReset() {
        const {field, currentFilter, valueSource, parentModel} = this,
            sourceStore = valueSource.isView ? valueSource.cube.store : valueSource,
            allRecords = sourceStore.allRecords.filter(rec => isEmpty(rec.allChildren)),
            allValues = uniq(allRecords.map(rec => parentModel.handleEmptyString(rec.data[field]))),
            pendingValue = {};

        // Initialize values to all true (default)
        allValues.forEach(key => pendingValue[key] = true);
        this.allValues = allValues;
        this.pendingValue = pendingValue;

        // Apply external filters *not* pertaining to this field to the sourceStore
        // to get the filtered set of available values to offer as options.
        const cleanedFilter = this.cleanFilter(currentFilter);
        let filteredRecords = allRecords;
        if (cleanedFilter) {
            const testFn = parseFilter(cleanedFilter).getTestFn(sourceStore);
            filteredRecords = allRecords.filter(it => testFn(it));
        }

        this.availableValues = uniq(filteredRecords.map(rec => parentModel.handleEmptyString(rec.data[field])));
        this.hasHiddenValues = this.availableValues.length < allValues.length;
        this.filterText = null;
    }

    @action
    doSyncWithFilter() {
        const {allValues, columnFilters, parentModel} = this,
            pendingValue = {};

        if (!isEmpty(columnFilters)) {
            const values = [];

            columnFilters.forEach(filter => {
                if (filter.op === '=') {
                    const newValues = castArray(filter.value).map(it => parentModel.handleEmptyString(it));
                    values.push(...newValues);
                }
            });

            if (values.length) {
                allValues.forEach(value => {
                    pendingValue[value] = values.includes(value);
                });
            }
        }

        this.pendingValue = pendingValue;
    }

    syncGrid() {
        const {availableValues, pendingValue, field} = this;
        const data = availableValues.map(value => {
            const isChecked = pendingValue[value];
            return {[field]: value, isChecked};
        });
        this.gridModel.loadData(data);
    }

    /**
     * Recursively modify a Filter|CompoundFilter to remove all FieldFilters that reference this column
     */
    cleanFilter(filter) {
        if (!filter) return filter;

        const {field, filters, op} = filter;
        if (filters) {
            const ret = compact(filters.map(it => this.cleanFilter(it)));
            return !isEmpty(ret) ? {op, filters: ret} : null;
        } else if (field === this.field) {
            return null;
        }

        return filter;
    }

    createGridModel() {
        const {field} = this,
            {EMPTY_STR} = FieldFilter,
            {renderer, rendererIsComplex, align, headerAlign, headerName} = this.parentModel.column; // Render values as they are in `gridModel`

        return new GridModel({
            store: {
                idSpec: (raw) => raw[field].toString(),
                fields: [
                    field,
                    {name: 'isChecked', type: 'bool'}
                ]
            },
            selModel: 'disabled',
            emptyText: 'No records found...',
            contextMenu: null,
            sizingMode: 'compact',
            stripeRows: false,
            sortBy: field,
            colDefaults: {sortable: false},
            columns: [
                {
                    field: 'isChecked',
                    headerName: ({gridModel}) => {
                        const {store} = gridModel;
                        return checkbox({
                            disabled: store.empty,
                            displayUnsetState: true,
                            value: this.allVisibleRecsChecked,
                            onChange: () => this.toggleBulk(!this.allVisibleRecsChecked)
                        });
                    },
                    width: 30,
                    rendererIsComplex: true,
                    elementRenderer: (v, {record}) => {
                        return checkbox({
                            displayUnsetState: true,
                            value: record.data.isChecked,
                            onChange: () => this.toggleNode(!v, record.id)
                        });
                    }
                },
                {
                    field,
                    flex: 1,
                    headerName,
                    align,
                    headerAlign,
                    renderer, // TODO - handle cases like bool check col where rendered values look null
                    rendererIsComplex,
                    comparator: (v1, v2, sortDir, abs, {defaultComparator}) => {
                        const mul = sortDir === 'desc' ? -1 : 1;
                        if (v1 === EMPTY_STR) return 1 * mul;
                        if (v2 === EMPTY_STR) return -1 * mul;
                        return defaultComparator(v1, v2);
                    }
                }
            ]
        });
    }

    getValueList() {
        const {allValues, pendingValue} = this,
            ret = [];

        allValues.forEach(value => {
            const include = pendingValue[value] ?? true;
            if (include) ret.push(this.parentModel.parseValue(value, '='));
        });

        return ret;
    }
}
