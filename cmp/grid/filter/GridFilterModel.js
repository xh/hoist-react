/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {parseFilter, flattenFilter} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {wait} from '@xh/hoist/promise';
import {isNil, isFunction, isString} from 'lodash';

import {GridFilterFieldSpec} from './GridFilterFieldSpec';

/**
 * Model for managing a Grid's column filters.
 */
export class GridFilterModel extends HoistModel {

    /** @member {GridModel} */
    gridModel;
    /** @member {(Store|View)} */
    bind;
    /** @member {(Store|View)} */
    valueSource;
    /** @member {GridFilterFieldSpec[]} */
    @managed fieldSpecs = [];

    /** @return {Filter} */
    get filter() {
        return this.isBound ? this.bind.filter : this._filter;
    }

    /** @return {boolean} */
    get isBound() {
        return !isNil(this.bind);
    }

    // Open state for filter dialog
    @observable dialogOpen = false;

    // Private filter state, used when not bound
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
     * @param {(Store|View)} [c.bind] - Store or cube View that should actually be filtered
     *      as column filters are applied. May be the same as `valueSource`. Provide 'null' if you
     *      wish to combine this model's filter with other filters, send it to the server, or otherwise
     *      observe and handle filter changes manually.
     * @param {(Store|View)} [c.valueSource] - Store or cube View to be used to provide suggested
     *      data values in column filters (if configured). Defaults to `bind` if provided.
     * @param {(Filter|* |[]|function)} [c.initialFilter] - Configuration for a filter appropriate
     *      to be rendered and managed by GridFilterModel, or a function to produce the same.
     */
    constructor({
        gridModel,
        fieldSpecs,
        fieldSpecDefaults,
        bind = null,
        valueSource = bind,
        initialFilter = null
    }) {
        super();
        makeObservable(this);
        this.gridModel = gridModel;
        this.bind = bind;
        this.valueSource = valueSource;
        this.fieldSpecs = this.parseFieldSpecs(fieldSpecs, fieldSpecDefaults);
        this._filter = isFunction(initialFilter) ? initialFilter() : initialFilter;
    }

    /**
     * @param {(Filter|Object)} filter - Filter, or config to create. If null, the filter will be removed
     */
    @action
    setFilter(filter) {
        filter = parseFilter(filter);
        if (this.isBound) {
            wait()
                .then(() => this.bind.setFilter(filter))
                .linkTo(this.gridModel.filterTask);
        } else {
            this._filter = filter;
        }
    }

    /**
     * Set / replace the filters for a given field.
     * @param {(Filter|Object|[])} filter - Filter(s), or config to create.
     */
    @action
    setColumnFilters(filter) {
        const ret = this.filter?.withFilter(filter) ?? filter;
        this.setFilter(ret);
    }

    /**
     * Appends the value of a new filter into the existing filter on the same field and operator.
     * If such no filter exists, one will be created. Only applicable for filters with multi-value operators.
     * @param {(Filter|Object)} filter - Filter, or config to create.
     */
    @action
    mergeColumnFilters(filter) {
        const ret = this.filter?.withFilter(filter, false) ?? filter;
        this.setFilter(ret);
    }

    /**
     * Remove the filters for a given field.
     * @param {string} field - field to identify this filters to be removed
     */
    @action
    clearColumnFilters(field) {
        const ret = this.filter?.withoutFiltersByField(field);
        this.setFilter(ret);
    }

    /**
     * Remove all FieldFilters and CompoundFilters
     */
    @action
    clear() {
        if (!this.filter) return;
        const ret = this.filter.withoutFiltersByType(['FieldFilter', 'CompoundFilter']);
        this.setFilter(ret);
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