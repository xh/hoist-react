/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {isEqual, every, castArray} from 'lodash';

import {Filter} from './Filter';

@HoistModel
export class FilterModel {

    /**
     * @member {Filter[]}
     */
    @bindable.ref
    filters = null;

    /**
     * @param {Object} c - FilterModel configuration.
     * @param {(Filter[]|Object[])} [c.filters] - collection of filters, or configs to create them.
     */
    constructor({filters = []}) {
        this.filters = this.parseFilters(filters);
    }

    /**
     * Adds filters to the filter model. If a matching filter already exists, it will be skipped.
     * @param {(Filter|Filter[]|Object|Object[])} filters - filters or configs to add.
     */
    addFilters(filters) {
        const toAdd = this.parseFilters(filters).filter(f => !this.findEqualFilter(f));
        this.setFilters([...this.filters, ...toAdd]);
    }

    /**
     * Removes filters from the filter model.
     * @param {(Filter|Filter[]|Object|Object[])} filters - filters or configs to remove.
     */
    removeFilters(filters) {
        filters = this.parseFilters(filters);
        const result = this.filters.filter(f => {
            return every(filters, it => !isEqual(f, it));
        });
        this.setFilters(result);
    }

    /**
     * Find a filter instance.
     * @param {Filter} filter - filter to find
     */
    findFilter(filter) {
        return this.filters.find(f => f === filter);
    }

    /**
     * Find an equivalent filter
     * @param {(Filter|Object)} filter - filter or config to find
     */
    findEqualFilter(filter) {
        filter = this.parseFilter(filter);
        return this.filters.find(f => isEqual(f, filter));
    }

    /**
     * Evaluates a Record or value against all the Filters.
     * @param {(Record|*)} v - Record or value to evaluate
     * @returns {boolean}
     */
    fn(v) {
        return every(this.filters, f => f.fn(v));
    }

    //------------------------
    // Implementation
    //------------------------
    parseFilters(filters) {
        if (!filters) return null;
        return castArray(filters).map(f => this.parseFilter(f));
    }

    parseFilter(filter) {
        return filter instanceof Filter ? filter : new Filter(filter);
    }
}