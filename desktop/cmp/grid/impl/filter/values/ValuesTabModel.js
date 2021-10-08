/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, SizingMode} from '@xh/hoist/core';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {parseFilter} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/cmp/grid';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {
    castArray,
    compact,
    difference,
    isEmpty,
    isNil,
    uniqBy,
    partition,
    without,
    isDate
} from 'lodash';

export class ValuesTabModel extends HoistModel {
    /** @member {ColumnHeaderFilterModel} */
    parentModel;

    /**
     * @member {GridModel} - Checkbox grid to display enumerated set of values
     */
    @managed @observable.ref gridModel;

    /**
     * @member {*[]} List of available (i.e. excluding hidden) values to display in the grid
     */
    @observable.ref values = [];

    /**
     * @member {*[]} List of all (i.e. including hidden) values in the dataset
     */
    @observable.ref allValues = [];

    /**
     * @member {*[]} List of currently checked values in the list
     */
    @observable.ref pendingValues = [];

    @bindable filterText = null; // Bound search term for `StoreFilterField`
    @observable hasHiddenValues = false; // Are values hidden due to filters on other columns?

    BLANK_STR = '[blank]';

    /**
     * @member {Object} - FieldFilter config output by this model
     */
    @computed.struct
    get filter() {
        return this.getFilter();
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

    get currentGridFilter() {
        return this.parentModel.currentGridFilter;
    }

    get columnFilters() {
        return this.parentModel.columnFilters;
    }

    get valueSource() {
        return this.parentModel.gridFilterModel.bind;
    }

    constructor(parentModel) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;
        this.gridModel = this.createGridModel();

        this.addReaction({
            track: () => [this.values, this.pendingValues],
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
    setRecsChecked(isChecked, values) {
        values = castArray(values);
        this.pendingValues = isChecked ?
            [...this.pendingValues, ...values] :
            without(this.pendingValues, ...values);
    }

    //-------------------
    // Implementation
    //-------------------
    getFilter() {
        const {pendingValues, values, allValues, field, BLANK_STR} = this,
            included = pendingValues.map(it => it === BLANK_STR ? null : it),
            excluded = difference(values, pendingValues).map(it => it === BLANK_STR ? null : it);

        if (included.length === allValues.length || excluded.length === allValues.length) {
            return null;
        }

        const weight = allValues.length <= 10 ? 2.5 : 1, // Prefer '=' for short lists
            op = included.length > (excluded.length * weight) ? '!=' : '=',
            arr = op === '=' ? included : excluded;

        if (isEmpty(arr)) return null;

        const value = arr.length === 1 ? arr[0] : arr;
        return {field, op, value};
    }

    @action
    doReset() {
        const {currentGridFilter, columnFilters, valueSource, BLANK_STR} = this,
            sourceStore = valueSource.isView ? valueSource.cube.store : valueSource,
            allRecords = sourceStore.allRecords;

        // Apply external filters *not* pertaining to this field to the sourceStore
        // to get the filtered set of available values to offer as options.
        const cleanedFilter = this.cleanFilter(currentGridFilter);
        let filteredRecords = allRecords;
        if (cleanedFilter) {
            const testFn = parseFilter(cleanedFilter).getTestFn(sourceStore);
            filteredRecords = allRecords.filter(testFn);
        }

        // Get values from current column filter
        const filterValues = [];
        columnFilters.forEach(filter => {
            const newValues = castArray(filter.value).map(value => isNil(value) ? BLANK_STR : value);
            filterValues.push(...newValues);
        });

        // Combine unique values from record sets and column filters.
        const allValues = uniqBy([
            ...allRecords.map(rec => this.valueFromRecord(rec)),
            ...filterValues
        ], this.getUniqueValue);
        let values;
        if (cleanedFilter) {
            values = uniqBy([
                ...filteredRecords.map(rec => this.valueFromRecord(rec)),
                ...filterValues
            ], this.getUniqueValue);
        } else {
            values = allValues;
        }

        this.allValues = allValues;
        this.values = this.pendingValues = values;
        this.hasHiddenValues = values.length < allValues.length;
        this.filterText = null;
    }

    @action
    doSyncWithFilter() {
        const {values, columnFilters, BLANK_STR} = this;

        if (isEmpty(columnFilters)) return;

        // We are only interested '!=' filters if we have no '=' filters.
        const [equalsFilters, notEqualsFilters] = partition(columnFilters, f => f.op === '='),
            useNotEquals = isEmpty(equalsFilters),
            arr = useNotEquals ? notEqualsFilters : equalsFilters,
            filterValues = [];

        arr.forEach(filter => {
            const newValues = castArray(filter.value).map(value => isNil(value) ? BLANK_STR : value);
            filterValues.push(...newValues); // Todo: Is this safe?
        });

        if (!filterValues.length) return;

        if (useNotEquals) {
            this.pendingValues = difference(values, filterValues);
        } else {
            this.pendingValues = filterValues;
        }
    }

    valueFromRecord(record) {
        const ret = record.get(this.field);
        return isNil(ret) || ret === '' ? this.BLANK_STR : ret;
    }

    getUniqueValue(value) {
        // Return ms timestamp for dates to facilitate uniqueness check
        return isDate(value) ? value.getTime() : value;
    }

    syncGrid() {
        const {values, pendingValues} = this;
        const data = values.map(value => {
            const isChecked = pendingValues.includes(value);
            return {value, isChecked};
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
        const {BLANK_STR} = this,
            {align, headerAlign, displayName} = this.parentModel.column,
            renderer = this.fieldSpec.renderer ?? this.parentModel.column.renderer;

        return new GridModel({
            store: {
                idSpec: (raw) => this.getUniqueValue(raw.value).toString(),
                fields: [
                    {name: 'value', type: 'auto'},
                    {name: 'isChecked', type: 'bool'}
                ]
            },
            selModel: 'disabled',
            emptyText: 'No records found...',
            contextMenu: null,
            sizingMode: SizingMode.COMPACT,
            stripeRows: false,
            sortBy: 'value',
            colDefaults: {sortable: false},
            onRowClicked: ({data: record}) => {
                this.setRecsChecked(!record.get('isChecked'), record.get('value'));
            },
            columns: [
                {
                    field: 'isChecked',
                    headerName: ({gridModel}) => {
                        const {store} = gridModel,
                            values = store.records.map(it => it.get('value'));
                        return checkbox({
                            disabled: store.empty,
                            displayUnsetState: true,
                            value: this.allVisibleRecsChecked,
                            onChange: () => this.setRecsChecked(!this.allVisibleRecsChecked, values)
                        });
                    },
                    width: 30,
                    rendererIsComplex: true,
                    elementRenderer: (v, {record}) => {
                        return checkbox({
                            displayUnsetState: true,
                            value: record.data.isChecked,
                            onChange: () => this.setRecsChecked(!v, record.get('value'))
                        });
                    }
                },
                {
                    field: 'value',
                    flex: 1,
                    displayName,
                    align,
                    headerAlign,
                    comparator: (v1, v2, sortDir, abs, {defaultComparator}) => {
                        const mul = sortDir === 'desc' ? -1 : 1;
                        if (v1 === BLANK_STR) return 1 * mul;
                        if (v2 === BLANK_STR) return -1 * mul;
                        return defaultComparator(v1, v2);
                    },
                    renderer: (value, context) => {
                        if (value === BLANK_STR) return value;
                        return renderer ? renderer(value, context) : value;
                    }
                }
            ]
        });
    }
}
