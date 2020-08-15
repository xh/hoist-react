/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {parseFilters} from '@xh/hoist/data';
import {isEmpty, isEqual} from 'lodash';

@HoistModel
export class FilterModel {

    get isFilterModel() {return true}

    /** @member {Filter[]} */
    @observable.ref
    filters = null;

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
     * Return a function that can be used to test a record or object.
     *
     * @param {Store} [store] - if provided, function returned will be a test appropriate
     *      for records of this store.  Otherwise, will be a test appropriate for anonymous
     *      objects.
     * @returns {function} - function taking a record or object and returning a boolean
     */
    getTestFn(store) {
        const tests = this.filters.map(f => f.getTestFn(store));
        return r => tests.every(test => test(r));
    }

    /**
     * Apply filter to an array of records or objects
     *
     * @param {(Object[] | Record[])} records
     * @return {(Object[] | Record[])} - records that pass this filter.
     */
    execute(records) {
        if (isEmpty(records)) return [];
        const testFn = this.getTestFn(records[0].store);
        return records.filter(testFn);
    }

    /**
     * Sets filters to the filter model.
     * @param {*|*[]} filters - One or more filter instances, or configs to create them.
     */
    setFilters(filters) {
        this.setFiltersInternal(parseFilters(filters));
    }

    /**
     * Adds filters to the filter model. If a matching filter already exists, it will be skipped.
     * @param {*|*[]} filters - One or more filter instances, or configs to create them.
     */
    addFilters(filters) {
        const toAdd = parseFilters(filters)
            .filter(f => !this.filters.some(it => it.equals(f)));
        this.setFiltersInternal([...this.filters, ...toAdd]);
    }

    /**
     * Removes filters from the filter model.
     * @param {*|*[]} filters - One or more filter instances, or configs to create them.
     */
    removeFilters(filters) {
        const toRemove = parseFilters(filters);
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
        }
    }
}