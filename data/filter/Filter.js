/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {parseFilter, combineValueFilters} from '@xh/hoist/data';
import {castArray, every} from 'lodash';

/**
 * Base class for Hoist data package Filters.
 * @abstract - not to be created / used directly.
 *
 * @see FieldFilter - filters by comparing the value of a given field to one or more given
 *      candidate values using one of several supported operators.
 * @see FunctionFilter - filters via a custom function specified by the developer or generated
 *      by a component such as StoreFilterField.
 * @see CompoundFilter - combines multiple filters (including other nested CompoundFilters) via
 *      an AND or OR operator.
 */
export class Filter {

    get isFilter() {return true}

    /**
     * Return a function that can be used to test a record or object.
     *
     * @param {Store} [store] - if provided, function returned will be appropriate
     *      for testing records of this store. Otherwise, function returned will be appropriate
     *      for testing anonymous objects.
     * @returns {FilterTestFn} - function taking a Record or Object and returning a boolean.
     */
    getTestFn(store) {
        throw XH.exception('Not implemented.');
    }

    /**
     * @returns {boolean} - true if the provided other Filter is equivalent to this instance.
     */
    equals(other) {
        throw XH.exception('Not implemented.');
    }

    /**
     * Modify this filter by joining with another filter.
     * @param {(Filter|Object)} filter - Filter, or config to create.
     * @param {boolean} replace - If true, existing nested filters on the same field | key will
     *  be replaced. If false, the new filter will be added. Multi-value FieldFilters on the
     *  same field will be combined.
     * @return {Filter} - the new Filter
     */
    withFilter(filter, replace = true) {
        const currFilters = this?.isCompoundFilter ? this.filters : [this];
        let ret;

        if (replace) {
            const newFilters = castArray(filter),
                field = newFilters[0]?.field,
                key = newFilters[0]?.key;

            if (field && every(newFilters, {field})) {
                const cleanedFilters = currFilters.filter(it => it && it.field !== field);
                ret = [...cleanedFilters, newFilters];
            } else if (key && every(newFilters, {key})) {
                const cleanedFilters = currFilters.filter(it => it && it.field !== field);
                ret = [...cleanedFilters, newFilters];
            } else {
                // Could not replace, append instead
                ret = [...currFilters, filter];
            }
        } else {
            ret = [...currFilters, filter];
        }

        return parseFilter(combineValueFilters(ret));
    }

    /**
     * Modify this filter by removing nested FieldFilters and CompoundFilters by field
     * @param {(string|string[])} fields - Filter field(s) to remove.
     * @return {Filter} - the new Filter
     */
    withoutFiltersByField(fields) {
        const currFilters = this?.isCompoundFilter ? this.filters : [this];
        return parseFilter(currFilters.filter(it => {
            for (const field of castArray(fields)) {
                if (it.field === field) return false;
            }
            return true;
        }));
    }

    /**
     * Modify this filter by removing nested FunctionFilters by key.
     * @param {(string|string[])} keys - Filter key(s) to remove.
     * @return {Filter} - the new Filter
     */
    withoutFiltersByKey(keys) {
        const currFilters = this?.isCompoundFilter ? this.filters : [this];
        return parseFilter(currFilters.filter(it => {
            for (const key of castArray(keys)) {
                if (it.keys === key) return false;
            }
            return true;
        }));
    }

    /**
     * Modify this filter by removing nested filters by type
     * @param {(string|string[])} types - Filter type(s) to remove.
     * @return {Filter} - the new Filter
     */
    withoutFiltersByType(types) {
        const currFilters = this?.isCompoundFilter ? this.filters : [this];
        return parseFilter(currFilters.filter(it => {
            for (const type of castArray(types)) {
                if (type === 'CompoundFilter' && it.isCompoundFilter) return false;
                if (type === 'FieldFilter' && it.isFieldFilter) return false;
                if (type === 'FunctionFilter' && it.isFunctionFilter) return false;
            }
            return true;
        }));
    }
}

/**
 * @callback FilterTestFn
 * @param {(Object|Record)} candidate - single Hoist Record or plain JS Object to evaluate.
 * @returns {boolean} - true if the candidate passes and should be included in filtered results.
 */
