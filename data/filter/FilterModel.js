/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {isEmpty, groupBy, every, some, values, castArray} from 'lodash';

import {Filter} from './Filter';

@HoistModel
export class FilterModel {

    /** @member {Filter[]} */
    @observable.ref
    filters = null;

    /** @member {function(v: (Record|Object)):boolean} */
    test = null;

    /**
     * @param {Object} c - FilterModel configuration.
     * @param {(Filter[]|Object[])} [c.filters] - collection of filters, or configs to create them.
     */
    constructor({filters = []} = {}) {
        this.filters = this.parseFilters(filters);
        this.updateTestFunction();
    }

    /**
     * Sets filters to the filter model.
     * @param {(Filter|Filter[]|string|string[]|Object|Object[])} filters - filters, filter strings or configs.
     */
    @action
    setFilters(filters) {
        this.filters = this.parseFilters(filters);
        this.updateTestFunction();
    }

    /**
     * Adds filters to the filter model. If a matching filter already exists, it will be skipped.
     * @param {(Filter|Filter[]|string|string[]|Object|Object[])} filters - filters, filter strings or configs to add.
     */
    @action
    addFilters(filters) {
        filters = this.parseFilters(filters);
        const toAdd = filters.filter(f => {
            return every(this.filters, it => !it.equals(f));
        });
        this.filters = [...this.filters, ...toAdd];
        this.updateTestFunction();
    }

    /**
     * Removes filters from the filter model.
     * @param {(Filter|Filter[]|string|string[]|Object|Object[])} filters - filters, filter strings or configs to remove.
     */
    @action
    removeFilters(filters) {
        filters = this.parseFilters(filters);
        this.filters = this.filters.filter(f => {
            return every(filters, it => !it.equals(f));
        });
        this.updateTestFunction();
    }

    //------------------------
    // Implementation
    //------------------------
    updateTestFunction() {
        this.test = this.createTestFunction();
    }

    /**
     * Creates a function that tests a Record or Object against all the Filters.
     * Filters across disparate fields are applied using AND.
     * Filters that share a field and operator are applied using OR.
     */
    createTestFunction() {
        const {filters} = this;
        if (isEmpty(filters)) return () => true;

        const byField = values(groupBy(filters, f => f.field + '|' + f.operator));
        return (v) => {
            return every(byField, fieldFilters => {
                return some(fieldFilters, f => f.test(v));
            });
        };
    }

    parseFilters(filters) {
        if (!filters) return null;
        return castArray(filters).map(f => this.parseFilter(f));
    }

    parseFilter(filter) {
        return filter instanceof Filter ? filter : Filter.parse(filter);
    }
}