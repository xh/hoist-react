/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {FieldFilter, parseFilter, flattenFilter} from '@xh/hoist/data';
import {wait} from '@xh/hoist/promise';
import {find, isString, castArray, uniq} from 'lodash';

import {GridFilterFieldSpec} from './GridFilterFieldSpec';

/**
 * Model for managing a Grid's column filters.
 */
export class GridFilterModel extends HoistModel {

    /** @member {GridModel} */
    gridModel;
    /** @member {(Store|View)} */
    bind;
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
        fieldSpecs,
        fieldSpecDefaults
    }) {
        super();
        makeObservable(this);
        this.gridModel = gridModel;
        this.bind = bind;
        this.fieldSpecs = this.parseFieldSpecs(fieldSpecs, fieldSpecDefaults);
    }

    /**
     * @param {(Filter|Object)} filter - Filter, or config to create. If null, the filter will be removed
     */
    @action
    setFilter(filter) {
        filter = parseFilter(filter);
        wait()
            .then(() => this.bind.setFilter(filter))
            .linkTo(this.gridModel.filterTask);
    }

    /**
     * Set / replace the filters for a given field.
     * @param {string} field - field to identify this filter
     * @param {(Filter|Object|[])} filter - Filter(s), or config to create. If null, the filter will be removed
     */
    @action
    setColumnFilters(field, filter) {
        const currFilter = this.filter,
            currFilters = currFilter?.isCompoundFilter ? currFilter.filters : [currFilter];

        // Strip out any existing filters for this field
        const newFilters = currFilters.filter(filter => {
            if (!filter) return false;
            if (filter.isFieldFilter && filter.field === field) return false;
            if (filter.isCompoundFilter && find(filter.filters, it => it.field === field)) return false;
            return true;
        });

        // Add in new filter
        newFilters.push(...castArray(filter));
        this.setFilter(newFilters);
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
        this.setFilter(null);
    }

    /**
     * Get all FieldFilters for specified field
     */
    getColumnFilters(field) {
        return flattenFilter(this.filter).filter(it => it.field === field);
    }

    getFieldSpec(field) {
        return this.fieldSpecs.find(it => it.field === field);
    }

    @action
    openDialog() {
        this.dialogOpen = true;
    }

    @action
    closeDialog() {
        this.dialogOpen = false;
    }

    //--------------------------------
    // Implementation
    //--------------------------------
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
}