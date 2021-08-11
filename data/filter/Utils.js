/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {CompoundFilter, FieldFilter, FunctionFilter} from '@xh/hoist/data';
import {castArray, flatMap, groupBy, isArray, isFunction} from 'lodash';

/**
 * Parse a filter from an object or array representation.
 *
 * @param {(*|Filter|*[])} spec - one or more filters or configs to create one.
 *      * An existing Filter instance will be returned directly as-is.
 *      * A null value will also be returned as-is. A null filter represents no filter at all,
 *        or the equivalent of a filter that always passes every record.
 *      * A raw Function will be converted to a `FunctionFilter` with key 'default'.
 *      * Arrays will be converted to a `CompoundFilter` with a default 'AND' operator.
 *      * Config objects will be returned as an appropriate concrete `Filter` subclass based on
 *        their properties.
 *
 * See `CompoundFilter`, `FieldFilter` and `FunctionFilter` for more info on supported configs.
 *
 * @returns {Filter}
 */
export function parseFilter(spec) {
    // Degenerate cases
    if (!spec || spec.isFilter) return spec;

    // Normalize special forms
    if (isFunction(spec)) spec = {key: 'default', testFn: spec};
    if (isArray(spec)) spec = {filters: spec};

    // Branch on properties
    if (spec.field) {
        return new FieldFilter(spec);
    }
    if (spec.key) {
        return new FunctionFilter(spec);
    }
    if (spec.filters) {
        const ret = new CompoundFilter(spec);
        switch (ret.filters.length) {
            case 0: return null;
            case 1: return ret.filters[0];
            default: return ret;
        }
    }

    console.error('Unable to identify filter type:', spec);
    return null;
}

/**
 * Replace filters in `filter` with `newFilter` by field.
 * @param {Filter} filter - Existing Filter to modify.
 * @param {(Filter|Object|[])} newFilter - New filter(s) to add, or config to create.
 * @param {string} field - Record Field name used to identify filters for replacement
 * @return {Filter} - the new Filter
 */
export function withFilterByField(filter, newFilter, field) {
    const currFilters = filter?.isCompoundFilter ? filter.filters : [filter],
        ret = currFilters.filter(it => it && it.field !== field);

    ret.push(...castArray(newFilter));
    return parseFilter(ret);
}

/**
 * Replace filters in `filter` with `newFilter` by key.
 * @param {Filter} filter - Existing Filter to modify.
 * @param {(Filter|Object|[])} newFilter - New filter(s) to add, or config to create.
 * @param {string} key - FunctionFilter key used to identify filters for replacement
 * @return {Filter} - the new Filter
 */
export function withFilterByKey(filter, newFilter, key) {
    const currFilters = filter?.isCompoundFilter ? filter.filters : [filter],
        ret = currFilters.filter(it => it && it.key !== key);

    ret.push(...castArray(newFilter));
    return parseFilter(ret);
}

/**
 * Replace filters in `filter` with `newFilter` by filter types.
 * @param {Filter} filter - Existing Filter to modify.
 * @param {(Filter|Object|[])} newFilter - New filter(s) to add, or config to create.
 * @param {string|string[]} types - Filter type(s) used to identify filters for replacement
 * @return {Filter} - the new Filter
 */
export function withFilterByTypes(filter, newFilter, types) {
    const currFilters = filter?.isCompoundFilter ? filter.filters : [filter];

    const ret = currFilters.filter(it => {
        for (const type of castArray(types)) {
            if (type === 'CompoundFilter' && it?.isCompoundFilter) return false;
            if (type === 'FieldFilter' && it?.isFieldFilter) return false;
            if (type === 'FunctionFilter' && it?.isFunctionFilter) return false;
        }
        return true;
    });

    ret.push(...castArray(newFilter));
    return parseFilter(ret);
}

/**
 * Recursively flatten a CompoundFilter, and return an array of all nested non-Compound filters
 *
 * @returns {Filter[]} - array of all nested non compound filters
 */
export function flattenFilter(spec) {
    if (!spec) return [];
    const {filters} = spec;
    if (!filters) return [spec];
    return flatMap(filters, flattenFilter);
}

/**
 * Recombine FieldFilters with array support on same field into single FieldFilter.
 * Filters other than array-based FieldFilters will be returned unmodified.
 *
 * @returns {Filter[]}
 */
export function combineValueFilters(filters = []) {
    const groupMap = groupBy(filters, ({op, field}) => `${op}|${field}`);
    return flatMap(groupMap, filters => {
        return (filters.length > 1 && FieldFilter.ARRAY_OPERATORS.includes(filters[0].op)) ?
            {...filters[0], value: flatMap(filters, it => it.value)} :
            filters;
    });
}