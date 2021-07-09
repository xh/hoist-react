/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {parseFilter} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/cmp/grid';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {castArray, compact, clone, isEmpty, isNil, uniq, partition} from 'lodash';

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
    getFilter() {
        const {allValues, pendingValue, field, BLANK_STR} = this,
            excluded = [],
            included = [];

        allValues.forEach(value => {
            const include = pendingValue[value] ?? true,
                arr = include ? included : excluded;
            arr.push(value === BLANK_STR ? null : value);
        });

        if (included.length === allValues.length || excluded.length === allValues.length) {
            return null;
        }

        const op = allValues.length <= 20 || included.length > excluded.length ? '!=' : '=',
            arr = op === '=' ? included : excluded,
            value = arr.length === 1 ? arr[0] : arr;

        return {field, op, value};
    }

    @action
    doReset() {
        const {currentFilter, valueSource} = this,
            sourceStore = valueSource.isView ? valueSource.cube.store : valueSource,
            allRecords = sourceStore.allRecords.filter(rec => isEmpty(rec.allChildren)),
            allValues = uniq(allRecords.map(rec => this.valueFromRecord(rec))),
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

        this.availableValues = uniq(filteredRecords.map(rec => this.valueFromRecord(rec)));
        this.hasHiddenValues = this.availableValues.length < allValues.length;
        this.filterText = null;
    }

    @action
    doSyncWithFilter() {
        const {allValues, columnFilters, BLANK_STR} = this,
            pendingValue = {};

        if (!isEmpty(columnFilters)) {
            // We are only interested '!=' filters if we have no '=' filters.
            const [equalsFilters, notEqualsFilters] = partition(columnFilters, f => f.op === '='),
                useNotEquals = isEmpty(equalsFilters),
                arr = useNotEquals ? notEqualsFilters : equalsFilters,
                values = [];

            arr.forEach(filter => {
                const newValues = castArray(filter.value).map(value => value ?? BLANK_STR);
                values.push(...newValues);
            });

            if (values.length) {
                allValues.forEach(value => {
                    const pending = values.includes(value);
                    pendingValue[value] = useNotEquals ? !pending : pending;
                });
            }
        }

        this.pendingValue = pendingValue;
    }

    valueFromRecord(record) {
        const ret = record.get(this.field);
        return isNil(ret) ? this.BLANK_STR : ret;
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
        const {field, BLANK_STR} = this,
            {renderer, align, headerAlign, displayName} = this.parentModel.column; // Render values as they are in `gridModel`

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
