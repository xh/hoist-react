/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {FieldFilter, FunctionFilter} from '@xh/hoist/data';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {castArray, every, groupBy, isEmpty, isPlainObject, some, values} from 'lodash';

@HoistModel
export class FilterModel {

    /** @member {Filter[]} */
    @observable.ref
    filters = null;

    /** @member {function(v: (Record|Object)):boolean} */
    test = null;

    /** @member {boolean} */
    @bindable
    includeChildren;

    /**
     * @param {Object} c - FilterModel configuration.
     * @param {(Filter[]|Object[])} [c.filters] - collection of filters, or configs to create them.
     * @param {boolean} [c.includeChildren] - true if all children of a passing record should
     *      also be considered passing (default false).
     */
    constructor({filters = [], includeChildren = false} = {}) {
        this.filters = this.parseFilters(filters);
        this.includeChildren = includeChildren;
        this.updateTestFunction();
    }

    /**
     * Sets filters to the filter model.
     * @param {(Filter|Filter[]|string|string[]|Object|Object[])} filters - Filter instances,
     *      strings, or configs.
     */
    @action
    setFilters(filters) {
        this.filters = this.parseFilters(filters);
        this.updateTestFunction();
    }

    /**
     * Adds filters to the filter model. If a matching filter already exists, it will be skipped.
     * @param {(Filter|Filter[]|string|string[]|Object|Object[])} filters - Filter instances,
     *      strings, or configs.
     */
    @action
    addFilters(filters) {
        const toAdd = this
            .parseFilter(filters)
            .filter(f => !this.filters.some(it => it.equals(f)));
        this.filters = [...this.filters, ...toAdd];
        this.updateTestFunction();
    }

    /**
     * Removes filters from the filter model.
     * @param {(Filter|Filter[]|string|string[]|Object|Object[])} filters - Filter instances,
     *      strings, or configs.
     */
    @action
    removeFilters(filters) {
        const toRemove = this.parseFilters(filters);
        this.filters = this.filters.filter(
            f => toRemove.some(it => it.equals(f))
        );
        this.updateTestFunction();
    }

    /** Removes all filters from the filter model. */
    @action
    clear() {
        this.filters = [];
    }

    /**
     * Convenience method to replace any matching Filters with a new set of Filters
     * @param {(Filter|Filter[]|string|string[]|Object|Object[])} filters - Filter instances,
     *      strings, or configs to replace. Any equivalent filters will be replaced, all other
     *      filters will be left in place. Note this method is only useful with FunctionFilters,
     *      which match on their `id` but can hold differing function implementations. FieldFilters
     *      include their value when matching, rendering this call a no-op.
     */
    @action
    replaceFilters(filters) {
        this.removeFilters(filters);
        this.addFilters(filters);
    }

    //------------------------
    // Implementation
    //------------------------
    updateTestFunction() {
        this.test = this.createTestFunction();
    }

    /**
     * Creates a function that tests a Record or Object against all the Filters.
     * FunctionFilters and FieldFilters across disparate fields are applied using AND.
     * FieldFilters that share a field and operator are applied using OR.
     */
    createTestFunction() {
        const {filters} = this;
        if (isEmpty(filters)) return () => true;

        const groups = values(groupBy(filters, f => {
            return f.isFieldFilter ? f.field + '|' + f.operator : f.id;
        }));

        return (v) => {
            return every(groups, groupedFilters => {
                return some(groupedFilters, filter => {
                    try {
                        return filter.test(v);
                    } catch (e) {
                        console.error(e);
                        return true; // Ignore this filter
                    }
                });
            });
        };
    }

    parseFilters(filters) {
        if (!filters) return [];
        return castArray(filters).map(f => this.parseFilter(f));
    }

    parseFilter(filter) {
        if (filter instanceof FieldFilter || filter instanceof FunctionFilter) return filter;
        if (isPlainObject(filter) && filter.testFn) return new FunctionFilter(filter);
        return FieldFilter.parse(filter);
    }
}