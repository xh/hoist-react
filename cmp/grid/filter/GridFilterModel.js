/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isNil, find, isEmpty, isFunction, isString, castArray} from 'lodash';

import {GridFilterFieldSpec} from './GridFilterFieldSpec';

/**
 * Model for managing a Grid's column filters.
 */
export class GridFilterModel extends HoistModel {

    /** @member {GridModel} */
    gridModel;
    /** @member {(Store|View)} */
    valueSource;
    /** @member {(Store|View)} */
    target;
    /** @member {GridFilterFieldSpec[]} */
    @managed fieldSpecs = [];

    /** @return {Filter} */
    get filter() {
        return this.hasTarget ? this.target.filter : this._filter;
    }

    /** @return {boolean} */
    get hasTarget() {
        return !isNil(this.target);
    }

    // Open state for filter dialog
    @observable dialogOpen = false;

    // Private filter state, used when `target` is not defined
    @observable.ref _filter;

    /**
     * @param {Object} c - GridFilterModel configuration.
     * @param {GridModel} c.gridModel - GridModel instance which owns this model.
     * @param {(string[]|Object[]} [c.fieldSpecs] - specifies the fields this model supports
     *      for filtering. Should be configs for a `GridFilterFieldSpec`. If a `valueSource`
     *      is provided, these may be specified as field names in that source or omitted entirely,
     *      indicating that all fields should be filter-enabled.
     * @param {Object} [c.fieldSpecDefaults] - default properties to be assigned to all
     *      GridFilterFieldSpecs created by this model.
     * @param {(Store|View)} [c.valueSource] - Store or cube View to be used to provide suggested
     *      data values in column filters (if configured).
     * @param {(Store|View)} [c.target] - Store or cube View that should actually be filtered
     *      as column filters are applied. May be the same as `valueSource`. Provide 'null' if you
     *      wish to combine this model's filter with other filters, send it to the server, or otherwise
     *      observe and handle filter changes manually.
     * @param {(Filter|* |[]|function)} [c.initialFilter] - Configuration for a filter appropriate
     *      to be rendered and managed by GridFilterModel, or a function to produce the same.
     */
    constructor({
        gridModel,
        fieldSpecs,
        fieldSpecDefaults,
        valueSource,
        target,
        initialFilter = null
    }) {
        super();
        makeObservable(this);

        throwIf(!gridModel, 'GridFilterModel requires a GridModel');

        this.gridModel = gridModel;
        this.valueSource = valueSource;
        this.target = target;
        this.fieldSpecs = this.parseFieldSpecs(fieldSpecs, fieldSpecDefaults);

        const filter = isFunction(initialFilter) ? initialFilter() : initialFilter;
        this.setFilter(filter);
    }

    /**
     * Set the filter on the target
     * @param {(Filter|Object)} filter - Filter, or config to create. If null, the filter will be removed
     */
    @action
    setFilter(filter) {
        if (this.hasTarget) {
            this.target.setFilter(filter);
        } else {
            this._filter = filter;
        }
    }

    /**
     * Set / replace the filters for a given field on the target
     * @param {string} field - field to identify this filter
     * @param {(Filter|Object|[])} filter - Filter(s), or config to create. If null, the filter will be removed
     */
    @action
    setColumnFilters(field, filter) {
        const currFilter = this.filter,
            currFilters = currFilter?.isCompoundFilter ? currFilter.filters : [currFilter],
            newFilters = [];

        // Strip out any existing filters for this field
        currFilters.forEach(filter => {
            if (!filter) return;
            if (filter.isFieldFilter && filter.field === field) return;
            if (filter.isCompoundFilter && find(filter.filters, it => it.field === field)) return;
            newFilters.push(filter);
        });

        // Add in new filter
        if (filter) newFilters.push(...castArray(filter));

        // Create compound filter if necessary
        let newFilter = null;
        if (!isEmpty(newFilters)) {
            newFilter = newFilters.length > 1 ? {filters: newFilters, op: 'AND'} : newFilters[0];
        }

        this.setFilter(newFilter);
    }

    /**
     * Clear the filter on the target
     */
    @action
    clear() {
        this.setFilter(null);
    }

    @action
    openDialog() {
        this.dialogOpen = true;
    }

    @action
    closeDialog() {
        this.dialogOpen = false;
    }

    getFieldSpec(field) {
        return this.fieldSpecs.find(it => it.field === field);
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    parseFieldSpecs(specs, fieldSpecDefaults) {
        const {valueSource} = this;

        throwIf(
            !valueSource && (!specs || specs.some(isString)),
            'Must provide a valueSource if fieldSpecs are not provided, or provided as strings.'
        );

        // If no specs provided, include all source fields.
        if (!specs) specs = valueSource.fieldNames;

        return specs.map(spec => {
            if (isString(spec)) spec = {field: spec};
            return new GridFilterFieldSpec({
                source: valueSource,
                ...fieldSpecDefaults,
                ...spec
            });
        });
    }
}