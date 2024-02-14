/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {castArray, flatMap, groupBy, isArray, isFunction} from 'lodash';

import {FilterLike} from './Types';
import {Filter} from './Filter';
import {FieldFilter} from './FieldFilter';
import {FunctionFilter} from './FunctionFilter';
import {CompoundFilter} from './CompoundFilter';
import {Some} from '@xh/hoist/core';

/**
 * Parse a filter from an object or array representation.
 *
 * @param spec - one or more filters or specs to create one.
 *      * An existing Filter instance will be returned directly as-is.
 *      * A null value will also be returned as-is. A null filter represents no filter at all,
 *        or the equivalent of a filter that always passes every record.
 *      * A raw Function will be converted to a `FunctionFilter` with key 'default'.
 *      * Arrays will be converted to a `CompoundFilter` with a default 'AND' operator.
 *      * Config objects will be returned as an appropriate concrete `Filter` subclass based on
 *        their properties.
 *
 * See `CompoundFilter`, `FieldFilter` and `FunctionFilter` for more info on supported configs.
 */
export function parseFilter(spec: FilterLike): Filter {
    let s = spec as any;

    // Degenerate cases
    if (!s || s instanceof Filter) return s as Filter;

    // Normalize special forms
    if (isFunction(s)) s = {key: 'default', testFn: s};
    if (isArray(s)) s = {filters: s};

    // Branch on properties
    if (s.field) {
        return new FieldFilter(s);
    }
    if (s.key) {
        return new FunctionFilter(s);
    }
    if (s.filters) {
        const ret = new CompoundFilter(s);
        switch (ret.filters.length) {
            case 0:
                return null;
            case 1:
                return ret.filters[0];
            default:
                return ret;
        }
    }

    console.error('Unable to identify filter type:', s);
    return null;
}

/**
 * Replace filters in `filter` with `newFilter` by field.
 * @param filter - Existing Filter to modify.
 * @param newFilter - New filter(s) to add.
 * @param field - StoreRecord Field name used to identify filters for replacement
 */
export function withFilterByField(
    filter: FilterLike,
    newFilter: FilterLike,
    field: string
): Filter {
    const isCompound = filter && 'filters' in filter,
        currFilters = isCompound ? filter.filters : [filter],
        ret = currFilters.filter((it: any) => it && it.field !== field) as FilterLike[];

    ret.push(...castArray(newFilter));
    return isCompound ? parseFilter({filters: ret, op: filter.op}) : parseFilter(ret);
}

/**
 * Replace filters in `filter` with `newFilter` by key.
 * @param filter - Existing Filter to modify.
 * @param newFilter - New filter(s) to add
 * @param key - FunctionFilter key used to identify filters for replacement
 */
export function withFilterByKey(filter: FilterLike, newFilter: FilterLike, key: string): Filter {
    const isCompound = filter && 'filters' in filter,
        currFilters = isCompound ? filter.filters : [filter],
        ret = currFilters.filter((it: any) => it && it.key !== key) as FilterLike[];

    ret.push(...castArray(newFilter));
    return isCompound ? parseFilter({filters: ret, op: filter.op}) : parseFilter(ret);
}

/**
 * Replace filters in `filter` with `newFilter` by filter types.
 * @param filter - Existing Filter to modify.
 * @param newFilter - New filter(s) to add.
 * @param types - Filter type(s) used to identify filters for replacement
 */
export function withFilterByTypes(
    filter: Filter,
    newFilter: FilterLike,
    types: Some<string>
): Filter {
    const isCompound = filter instanceof CompoundFilter,
        currFilters = isCompound ? filter.filters : ([filter] as FilterLike[]);

    const ret = currFilters.filter(it => {
        for (const type of castArray(types)) {
            if (type === 'CompoundFilter' && it instanceof CompoundFilter) return false;
            if (type === 'FieldFilter' && it instanceof FieldFilter) return false;
            if (type === 'FunctionFilter' && it instanceof FunctionFilter) return false;
        }
        return true;
    });

    ret.push(...castArray(newFilter));
    return isCompound ? parseFilter({filters: ret, op: filter.op}) : parseFilter(ret);
}

/**
 * Recursively flatten a CompoundFilter, and return an array of all nested non-compound filters
 * @returns array of all nested non-compound filters
 */
export function flattenFilter(spec: FilterLike): Filter[] {
    const s = spec as any;
    if (!s) return [];
    const {filters} = s;
    if (!filters) return [s];
    return flatMap(filters, flattenFilter);
}

/**
 * Recombine FieldFilters with array support on same field into single FieldFilter.
 * Filters other than array-based FieldFilters will be returned unmodified.
 */
export function combineValueFilters(filters = []): Filter[] {
    const groupMap = groupBy(filters, ({op, field}) => `${op}|${field}`);
    return flatMap(groupMap, filters => {
        return filters.length > 1 && FieldFilter.ARRAY_OPERATORS.includes(filters[0].op)
            ? {...filters[0], value: flatMap(filters, it => it.value)}
            : filters;
    });
}
