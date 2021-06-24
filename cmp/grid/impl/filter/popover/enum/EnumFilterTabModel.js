/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed} from '@xh/hoist/core';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {parseFilter, flattenFilter} from '@xh/hoist/data';
import {GridModel} from '@xh/hoist/cmp/grid';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {
    castArray,
    compact,
    clone,
    isEmpty,
    isEqual,
    keys,
    forOwn,
    pickBy,
    uniq
} from 'lodash';

export class EnumFilterTabModel extends HoistModel {
    /** @member {FilterPopoverModel} */
    parentModel;

    /**
     * @member {GridModel} - Checkbox grid to display enumerated set of record values to add
     * or remove from `gridModel.store.filter`
     */
    @managed @observable.ref gridModel;

    /**
     * @member {Object} Key-value pairs of enumerated value to boolean, indicating whether value is
     * checked/unchecked (i.e. included in '=' `FieldFilter`)
     */
    @bindable.ref initialValue = {}; // All values for column (with no filter applied, all true)
    @bindable.ref committedValue = {}; // All values in committed filter state
    @observable.ref pendingValue = {}; // Local state of enumerated values loaded in `gridModel`

    @bindable filterText = null; // Bound search term for `StoreFilterField`

    /**
     * @member {Object} - FieldFilter config output by this model
     */
    @computed.struct
    get filter() {
        const {initialValue, committedValue, colId} = this;
        if (isEqual(initialValue, committedValue)) return null;

        const values = this.getCommittedValueList();
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

    get store() {
        return this.parentModel.store;
    }

    get storeFilter() {
        return this.parentModel.storeFilter;
    }

    get colId() {
        return this.parentModel.colId;
    }

    get type() {
        return this.parentModel.type;
    }

    constructor(parentModel) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;
        this.gridModel = this.createGridModel();

        this.addReaction({
            track: () => [this.storeFilter, this.store.lastUpdated],
            run: () => this.syncState(),
            fireImmediately: true
        });
    }

    @action
    commit() {
        const {pendingValue} = this,
            ret = clone(this.committedValue);

        for (const val in pendingValue) {
            ret[val] = pendingValue[val];
        }

        this.committedValue = ret;
    }

    @action
    clear() {
        this.committedValue = {};
        this.setPendingValue(this.initialValue);
        this.commit();
    }

    @action
    toggleNode(isChecked, value) {
        const {pendingValue} = this,
            currValue = {
                ...pendingValue,
                [value]: isChecked
            };
        this.setPendingValue(currValue);
    }

    @action
    toggleBulk(isChecked) {
        const {records} = this.gridModel.store,
            ret = clone(this.pendingValue);
        for (let rec of records) {
            ret[rec.id] = isChecked;
        }
        this.setPendingValue(ret);
    }

    @action
    setPendingValue(newValue) {
        const {pendingValue, gridModel} = this;
        if (isEqual(newValue, pendingValue)) return;

        this.pendingValue = newValue;
        const ret = [];
        for (const key in newValue) {
            if (gridModel.store.getById(key)) {
                ret.push({id: key, isChecked: newValue[key]});
            }
        }
        gridModel.store.modifyRecords(ret);
    }

    //-------------------
    // Implementation
    //-------------------
    @action
    syncState() {
        const {storeFilter, store, colId} = this,
            allRecords = store.allRecords.filter(rec => isEmpty(rec.allChildren)),
            allValues = uniq(allRecords.map(rec => rec.data[colId])),
            initialValue = {},
            committedValue = {};

        // Initialize values to all true (default)
        allValues.forEach(key => {
            initialValue[key] = true;
            committedValue[key] = true;
        });

        // Read committed value from the store filter.
        if (storeFilter) {
            const columnFilters = flattenFilter(storeFilter).filter(it => it.field === colId),
                values = [];

            // If the store filter contains equals filters for this column, set the committed
            // value to reflect that store filter.
            columnFilters.forEach(filter => {
                if (filter.op === '=') values.push(...castArray(filter.value));
            });

            if (values.length) {
                forOwn(committedValue, (v, key) => {
                    committedValue[key] = values.includes(key);
                });
            }
        }

        this.initialValue = initialValue;
        this.committedValue = this.pendingValue = committedValue;

        // Apply external store filters *not* pertaining to this field to get the
        // filtered set of values to offer as options.
        const cleanStoreFilter = this.cleanFilter(storeFilter);
        let filteredRecords = allRecords;
        if (cleanStoreFilter) {
            const testFn = parseFilter(cleanStoreFilter).getTestFn(store);
            filteredRecords = allRecords.filter(it => testFn(it));
        }

        const options = uniq(filteredRecords.map(rec => rec.data[colId])),
            data = options.map(value => {
                const isChecked = committedValue[value];
                return {[colId]: value, isChecked};
            });

        this.gridModel.loadData(data);

        // Clear StoreFilterField
        this.setFilterText(null);
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

    getCommittedValueList() {
        let ret = keys(pickBy(this.committedValue, v => v));

        // Parse boolean strings to their primitive values
        if (this.type === 'bool') {
            ret = ret.map(it => {
                if (it === 'true') return true;
                if (it === 'false') return false;
                return null;
            });
        }

        return ret;
    }
}
