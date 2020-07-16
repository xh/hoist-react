/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {isEqual, isEmpty, groupBy, every, some, castArray} from 'lodash';

import {Filter} from './Filter';

@HoistModel
export class FilterModel {

    /**
     * @member {Filter[]}
     */
    @observable.ref
    filters = null;

    /**
     * @param {Object} c - FilterModel configuration.
     * @param {(Filter[]|Object[])} [c.filters] - collection of filters, or configs to create them.
     */
    constructor({filters = []} = {}) {
        this.filters = this.parseFilters(filters);
    }

    /**
     * Sets filters to the filter model.
     * @param {(Filter|Filter[]|string|string[]|Object|Object[])} filters - filters, filter strings or configs.
     */
    @action
    setFilters(filters) {
        this.filters = this.parseFilters(filters);
    }

    /**
     * Adds filters to the filter model. If a matching filter already exists, it will be skipped.
     * @param {(Filter|Filter[]|string|string[]|Object|Object[])} filters - filters, filter strings or configs to add.
     */
    @action
    addFilters(filters) {
        const toAdd = this.parseFilters(filters).filter(f => !this.findEqualFilter(f));
        this.filters = [...this.filters, ...toAdd];
    }

    /**
     * Removes filters from the filter model.
     * @param {(Filter|Filter[]|string|string[]|Object|Object[])} filters - filters, filter strings or configs to remove.
     */
    @action
    removeFilters(filters) {
        filters = this.parseFilters(filters);
        const result = this.filters.filter(f => {
            return every(filters, it => !isEqual(f, it));
        });
        this.filters = result;
    }

    /**
     * Find a filter
     * @param {(Filter|string|Object)} filter - filter, filter string or config to find
     */
    findEqualFilter(filter) {
        filter = this.parseFilter(filter);
        return this.filters.find(f => isEqual(f, filter));
    }

    /**
     * Evaluates a Record or value against all the Filters.
     * Filters that share fields are applied using OR, whilst
     * filter across fields are applied using AND.
     * 
     * @param {(Record|*)} v - Record or value to evaluate
     * @returns {boolean}
     */
    fn(v) {
        const {filters} = this;
        if (isEmpty(filters)) return true;

        const byField = groupBy(filters, f => f.field);
        return every(byField, fieldFilters => {
            return some(fieldFilters, f => f.fn(v));
        });
    }

    //------------------------
    // Implementation
    //------------------------
    parseFilters(filters) {
        if (!filters) return null;
        return castArray(filters).map(f => this.parseFilter(f));
    }

    parseFilter(filter) {
        return filter instanceof Filter ? filter : Filter.parse(filter);
    }
}