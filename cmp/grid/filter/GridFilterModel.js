/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed} from '@xh/hoist/core';
import {action, bindable, observable, makeObservable} from '@xh/hoist/mobx';
import {FieldFilter, flattenFilter, withFilterByField, withFilterByTypes} from '@xh/hoist/data';
import {wait} from '@xh/hoist/promise';
import {find, isString, castArray, uniq, every, compact} from 'lodash';

import {GridFilterFieldSpec} from './GridFilterFieldSpec';

/**
 * Model for managing a Grid's column filters.
 */
export class GridFilterModel extends HoistModel {

    /** @member {GridModel} */
    gridModel;
    /** @member {(Store|View)} */
    bind;
    /** @member {boolean} */
    @bindable commitOnChange;
    /** @member {GridFilterFieldSpec[]} */
    @managed fieldSpecs = [];

    /** @return {Filter} */
    get filter() {
        return this.bind.filter;
    }

    // Open state for filter dialog
    @observable dialogOpen = false;

    /**
     * @param {Object} c - GridFilterModel configuration.
     * @param {GridModel} c.gridModel - GridModel instance which owns this model.
     * @param {(Store|View)} c.bind - Store or cube View that should actually be filtered
     *      as column filters are applied, and used to provide suggested data values in
     *      column filters (if configured).
     * @param {boolean} [c.commitOnChange] - true (default) to eagerly commit filters on each change.
     * @param {(string[]|Object[]} [c.fieldSpecs] - specifies the fields this model supports
     *      for filtering. Should be configs for a `GridFilterFieldSpec`. These may be specified
     *      as field names in bound Store/View or omitted entirely, indicating that all fields
     *      should be filter-enabled.
     * @param {Object} [c.fieldSpecDefaults] - default properties to be assigned to all
     *      GridFilterFieldSpecs created by this model.
     */
    constructor({
        gridModel,
        bind,
        commitOnChange = true,
        fieldSpecs,
        fieldSpecDefaults
    }) {
        super();
        makeObservable(this);
        this.gridModel = gridModel;
        this.bind = bind;
        this.commitOnChange = commitOnChange;
        this.fieldSpecs = this.parseFieldSpecs(fieldSpecs, fieldSpecDefaults);
    }

    /**
     * Set / replace the filters for a given field.
     * @param {string} field - field to identify this filter
     * @param {(Filter|Object|[])} filter - Filter(s), or config to create. If null, the filter will be removed
     */
    @action
    setColumnFilters(field, filter) {
        // If current bound filter is an CompoundFilter for a single column, wrap it
        // in an 'AND' CompoundFilter so new columns get 'ANDed' alongside it.
        let currFilter = this.filter;
        if (currFilter?.isCompoundFilter && currFilter.field) {
            currFilter = {filters: [currFilter], op: 'AND'};
        }

        const ret = withFilterByField(currFilter, filter, field);
        this.setFilter(ret);
    }

    /**
     * Appends the value of a new filter into the existing filter on the same field and operator.
     * If such no filter exists, one will be created. Only applicable for filters with multi-value operators.
     * @param {string} field - field to identify this filter
     * @param {(Filter|Object)} filter - Filter, or config to create. If null, the filter will be removed
     */
    @action
    mergeColumnFilters(field, filter) {
        const {op} = filter;
        if (FieldFilter.ARRAY_OPERATORS.includes(op)) {
            const currFilters = flattenFilter(this.filter),
                match = find(currFilters, {field, op});

            if (match) {
                filter.value = uniq([
                    ...castArray(filter.value),
                    ...castArray(match.value)
                ]);
            }
        }
        this.setColumnFilters(field, filter);
    }

    @action
    clear() {
        const ret = withFilterByTypes(this.filter, null, ['FieldFilter', 'CompoundFilter']);
        this.setFilter(ret);
    }

    /**
     * Get all FieldFilters for specified field
     */
    getColumnFilters(field) {
        return flattenFilter(this.filter).filter(it => it.field === field);
    }

    /**
     * Get the CompoundFilter that wraps the filters for specified field
     */
    getColumnCompoundFilter(field) {
        return this.getOuterCompoundFilter(this.filter, field);
    }

    getFieldSpec(field) {
        return this.fieldSpecs.find(it => it.field === field);
    }

    /** @package */
    @action
    openDialog() {
        this.dialogOpen = true;
    }

    /** @package */
    @action
    closeDialog() {
        this.dialogOpen = false;
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    setFilter(filter) {
        wait()
            .then(() => this.bind.setFilter(filter))
            .linkTo(this.gridModel.filterTask);
    }

    parseFieldSpecs(specs, fieldSpecDefaults) {
        const {bind} = this;

        // If no specs provided, include all source fields.
        if (!specs) specs = bind.fieldNames;

        return specs.map(spec => {
            if (isString(spec)) spec = {field: spec};
            return new GridFilterFieldSpec({
                source: bind,
                ...fieldSpecDefaults,
                ...spec
            });
        });
    }

    getOuterCompoundFilter(filter, field) {
        if (!filter?.isCompoundFilter) return null;

        // This is the outer compound filter if all its children
        // are FieldFilters on the matching field.
        if (every(filter.filters, it => it.field === field)) {
            return filter;
        }

        // Otherwise, check any CompoundFilter children
        const results = compact(filter.filters.map(it => this.getOuterCompoundFilter(it, field)));
        return results.length === 1 ? results[0] : null;
    }
}