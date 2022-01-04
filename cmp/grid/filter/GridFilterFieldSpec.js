/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {BaseFilterFieldSpec} from '@xh/hoist/data/filter/BaseFilterFieldSpec';
import {parseFilter} from '@xh/hoist/data';
import {castArray, compact, isDate, isEmpty, uniqBy} from 'lodash';

/**
 * Apps should NOT instantiate this class directly. Instead {@see GridFilterModel.fieldSpecs}
 * for the relevant config to set these options.
 */
export class GridFilterFieldSpec extends BaseFilterFieldSpec {

    /** @member {GridFilterModel} */
    filterModel;

    /** @member {boolean} */
    enableValues;

    /** @member {Column~rendererFn} */
    renderer;

    /** @member {object} */
    inputProps;

    /** @member {string} */
    defaultOp;

    /** @member {?Array} - List of all (i.e. including hidden) values values for this field. */
    allValues;

    /**
     * @param {Object} c - GridFilterFieldSpec configuration.
     * @param {GridFilterModel} c.filterModel - parent GridFilterModel which owns this field spec.
     * @param {boolean} [c.enableValues] - true to provide the value filter control
     *      within the filter affordance. Defaults to true for enumerable fieldTypes.
     * @param {Column~rendererFn} [c.renderer] - function returning a formatted string for each
     *      value in this values filter display. If not provided, the Column's renderer will be used.
     * @param {Object} [c.inputProps] - Props to pass through to the HoistInput components used on
     *      the custom filter tab. Note that the HoistInput component used is decided by fieldType.
     * @param {string} [c.defaultOp] - Default operator displayed in custom filter tab.
     * @param {*} [c...rest] - arguments for BaseFilterFieldSpec.
     */
    constructor({
        filterModel,
        enableValues,
        renderer,
        inputProps,
        defaultOp,
        ...rest
    }) {
        super(rest);

        this.filterModel = filterModel;
        this.enableValues = enableValues ?? this.isEnumerableByDefault;
        this.renderer = renderer;
        this.inputProps = inputProps;
        this.defaultOp = this.ops.includes(defaultOp) ? defaultOp : this.ops[0];
        this._hasExplicitValues = !isEmpty(this.values);
    }

    loadValues() {
        if (this._hasExplicitValues || !this.enableValues) return;
        this.loadValuesFromSource();
    }

    /**
     * @param {string} op
     * @returns {boolean}
     */
    supportsSuggestions(op) {
        return this.values &&
            this.enableValues &&
            this.supportsOperator(op) &&
            (op === '=' || op === '!=');
    }

    //------------------------
    // Implementation
    //------------------------
    loadValuesFromSource() {
        const {filterModel, field, source} = this,
            columnFilters = filterModel.getColumnFilters(field),
            sourceStore = source.isView ? source.cube.store : source,
            allRecords = sourceStore.allRecords;

        // Apply external filters *not* pertaining to this field to the sourceStore
        // to get the filtered set of available values to offer as options.
        const cleanedFilter = this.cleanFilter(filterModel.filter);
        let filteredRecords = allRecords;
        if (cleanedFilter) {
            const testFn = parseFilter(cleanedFilter).getTestFn(sourceStore);
            filteredRecords = allRecords.filter(testFn);
        }

        // Get values from current column filter
        const filterValues = [];
        columnFilters.forEach(filter => {
            const newValues = castArray(filter.value).map(value => filterModel.toDisplayValue(value));
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
        const {filterModel, field} = this;
        return filterModel.toDisplayValue(record.get(field));
    }

    getUniqueValue(value) {
        // Return ms timestamp for dates to facilitate uniqueness check
        return isDate(value) ? value.getTime() : value;
    }
}
