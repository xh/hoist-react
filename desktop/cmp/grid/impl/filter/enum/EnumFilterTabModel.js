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
        const {allValues, colId} = this,
            values = this.getValueList();

        if (isEqual(allValues, values)) return null;

        return {
            field: colId,
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

    get currentFilter() {
        return this.parentModel.currentFilter;
    }

    get columnFilters() {
        return this.parentModel.columnFilters;
    }

    get colId() {
        return this.parentModel.colId;
    }

    get type() {
        return this.parentModel.type;
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
        const {colId, currentFilter, valueSource} = this,
            sourceStore = valueSource.isView ? valueSource.cube.store : valueSource,
            allRecords = sourceStore.allRecords.filter(rec => isEmpty(rec.allChildren)),
            allValues = uniq(allRecords.map(rec => rec.data[colId])),
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

        this.availableValues = uniq(filteredRecords.map(rec => rec.data[colId]));
        this.hasHiddenValues = this.availableValues.length < allValues.length;
        this.filterText = null;
    }

    @action
    doSyncWithFilter() {
        const {allValues, columnFilters} = this,
            pendingValue = {};

        if (!isEmpty(columnFilters)) {
            const values = [];

            columnFilters.forEach(filter => {
                if (filter.op === '=') values.push(...castArray(filter.value));
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
        const {availableValues, pendingValue, colId} = this;
        const data = availableValues.map(value => {
            const isChecked = pendingValue[value];
            return {[colId]: value, isChecked};
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
        } else if (field === this.colId) {
            return null;
        }

        return filter;
    }

    createGridModel() {
        const {renderer, rendererIsComplex, align, headerAlign, headerName} = this.parentModel.xhColumn; // Render values as they are in `gridModel`
        return new GridModel({
            store: {
                idSpec: (raw) => raw[this.colId].toString(),
                fields: [
                    this.colId,
                    {name: 'isChecked', type: 'bool'}
                ]
            },
            selModel: 'disabled',
            emptyText: 'No records found...',
            contextMenu: null,
            sizingMode: 'compact',
            stripeRows: false,
            sortBy: this.colId,
            columns: [
                {
                    field: 'isChecked',
                    sortable: false,
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
                    field: this.colId,
                    flex: 1,
                    sortable: false,
                    headerName,
                    align,
                    headerAlign,
                    renderer, // TODO - handle cases like bool check col where rendered values look null
                    rendererIsComplex
                }
            ]
        });
    }

    getValueList() {
        const {allValues, pendingValue} = this,
            ret = [];

        allValues.forEach(value => {
            const include = pendingValue[value] ?? true;
            if (include) ret.push(value);
        });

        // Parse boolean strings to their primitive values
        if (this.type === 'bool') {
            return ret.map(it => {
                if (it === 'true') return true;
                if (it === 'false') return false;
                return null;
            });
        }

        return ret;
    }
}
