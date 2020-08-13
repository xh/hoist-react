/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {FieldFilter, FunctionFilter} from '@xh/hoist/data';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {castArray, every, isEmpty, isFunction, isEqual} from 'lodash';

@HoistModel
export class FilterModel {

    get isFilterModel() {return true}

    /** @member {Filter[]} */
    @observable.ref
    filters = null;

    /** @member {function(v: (Record|Object)):boolean} */
    test = null;

    /** @member {boolean} */
    @bindable
    includeChildren;

    /**
     * @param {*|*[]} filters - One or more filter instances, or configs to create them.
     * @param {Object} [c] - Additional optional configuration.
     * @param {boolean} [c.includeChildren] - true if all children of a passing record should
     *      also be considered passing (default false).
     */
    constructor(filters = [], {includeChildren = false} = {}) {
        this.includeChildren = includeChildren;
        this.setFilters(filters);
    }

    /**
     * Sets filters to the filter model.
     * @param {*|*[]} filters - One or more filter instances, or configs to create them.
     */
    setFilters(filters) {
        this.setFiltersInternal(this.parseFilters(filters));
    }

    /**
     * Adds filters to the filter model. If a matching filter already exists, it will be skipped.
     * @param {*|*[]} filters - One or more filter instances, or configs to create them.
     */
    addFilters(filters) {
        const toAdd = this
            .parseFilters(filters)
            .filter(f => !this.filters.some(it => it.equals(f)));
        this.setFiltersInternal([...this.filters, ...toAdd]);
    }

    /**
     * Removes filters from the filter model.
     * @param {*|*[]} filters - One or more filter instances, or configs to create them.
     */
    removeFilters(filters) {
        const toRemove = this.parseFilters(filters);
        this.setFiltersInternal(
            this.filters.filter(f => !toRemove.some(it => it.equals(f)))
        );
    }

    /**
     * Removes all filters associated with a group from this model.
     * @param {String} group
     */
    removeFiltersByGroup(group) {
        this.setFiltersInternal(
            this.filters.filter(f => f.group != group)
        );
    }


    /** Removes all filters from the filter model. */
    clear() {
        this.setFiltersInternal([]);
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    setFiltersInternal(filters) {
        if (!isEqual(filters, this.filters)) {
            this.filters = Object.freeze(filters);
            this.test = this.createTestFunction();
        }
    }

    /**
     * Creates a function that tests a Record or Object against all the Filters.
     */
    createTestFunction() {
        const {filters} = this;
        if (isEmpty(filters)) return () => true;
        return (v) => every(filters, filter => filter.test(v));
    }

    parseFilters(filters) {
        if (!filters) return [];
        return castArray(filters).map(f => this.parseFilter(f));
    }

    parseFilter(filter) {
        if (filter.isFieldFilter || filter.isFunctionFilter) return filter;
        return (isFunction(filter) || filter.testFn) ?
            FunctionFilter.create(filter) :
            FieldFilter.create(filter);
    }
}