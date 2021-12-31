/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {parseFilter} from '@xh/hoist/data';
import {castArray, compact, isDate, isEmpty, isNil, uniqBy} from 'lodash';

/**
 * Extracts the available values in the dataset for the ColumnHeaderFilter.
 */
export class StoreValuesModel extends HoistModel {
    /** @member {ColumnHeaderFilterModel} */
    parentModel;

    /**
     * @member {*[]} List of available values for this field.
     *      This excludes values hidden by other filters on the Store.
     */
    @observable.ref values = [];

    /**
     * @member {*[]} List of all (i.e. including hidden) values values for this field.
     */
    @observable.ref allValues = [];

    BLANK_STR = '[blank]';

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
    }

    // Todo: Better name?
    toDisplayValue(value) {
        return isNil(value) || value === '' ? this.BLANK_STR : value;
    }

    // Todo: Better name?
    fromDisplayValue(value) {
        return value === this.BLANK_STR ? null : value;
    }

    @action
    refresh() {
        const {currentGridFilter, columnFilters, valueSource} = this,
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
            const newValues = castArray(filter.value).map(value => this.toDisplayValue(value));
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

        this.values = values;
        this.allValues = allValues;
    }

    //----------------------
    // Implementation
    //----------------------
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

    valueFromRecord(record) {
        return this.toDisplayValue(record.get(this.field));
    }

    getUniqueValue(value) {
        // Return ms timestamp for dates to facilitate uniqueness check
        return isDate(value) ? value.getTime() : value;
    }
}