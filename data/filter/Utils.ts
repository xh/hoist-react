/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Some} from '@xh/hoist/core';
import {CompoundFilter, FunctionFilter} from '@xh/hoist/data';
import {apiDeprecated, logError} from '@xh/hoist/utils/js';
import {castArray, compact, flatMap, groupBy, isArray, isFunction} from 'lodash';
import {FieldFilter} from './FieldFilter';
import {Filter} from './Filter';
import {FieldFilterSpec, FilterLike} from './Types';

/**
 * Parse a filter from an object or array representation.
 *
 * @param spec - one or more filters or specs to create one.
 *      * An existing Filter instance will be returned directly as-is.
 *      * Null/undefined or empty array will return `null`, representing no filter.
 *      * A raw Function will be converted to a `FunctionFilter` with key 'default'.
 *      * Non-empty arrays will return a `CompoundFilter` with a default 'AND' operator.
 *      * Config objects will be returned as an appropriate concrete `Filter` subclass based on
 *        their properties.
 *
 * See `CompoundFilter`, `FieldFilter` and `FunctionFilter` for more info on supported configs.
 */
export function parseFilter(spec: FilterLike): Filter {
    let s = spec as any;

    // Degenerate cases
    if (s instanceof Filter) return s as Filter;
    if (!s || (isArray(s) && s.length === 0)) return null;

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

    logError(['Unable to identify filter type:', s]);
    return null;
}

/**
 * Combine a `source` filter with one or more `additions` via AND.
 *
 * If `source` is already an AND CompoundFilter, additions are appended to its children
 * (flattened) rather than nesting AND(AND(...), new). Null/empty values on either side are
 * handled gracefully.
 *
 * @param source - existing filter to build on, or null.
 * @param additions - one or more filters to append.
 * @returns the combined filter, or null if all inputs are null/empty.
 */
export function appendFilter(source: Filter, ...additions: FilterLike[]): Filter {
    const parsed = compact(additions.map(parseFilter));
    if (!source && parsed.length === 0) return null;
    if (!source && parsed.length === 1) return parsed[0];

    const sourceFilters =
        source instanceof CompoundFilter && source.op === 'AND'
            ? source.filters
            : compact([source]);

    return parseFilter({filters: [...sourceFilters, ...parsed], op: 'AND'});
}

//----------------------------------------------------------------------
// Deprecated aliases - use Filter instance methods instead
//----------------------------------------------------------------------
/** @deprecated Use `filter.removeFieldFilter(field)` and `appendFilter()` instead. */
export function withFilterByField(
    filter: FilterLike,
    newFilter: FilterLike,
    field: string
): Filter {
    apiDeprecated('withFilterByField', {
        msg: 'Use filter.removeFieldFilter(field) and appendFilter() instead.',
        v: '85.0'
    });
    const source = parseFilter(filter);
    return appendFilter(source?.removeFieldFilter(field), newFilter);
}

/** @deprecated Use `filter.removeFunctionFilter(key)` and `appendFilter()` instead. */
export function withFilterByKey(filter: FilterLike, newFilter: FilterLike, key: string): Filter {
    apiDeprecated('withFilterByKey', {
        msg: 'Use filter.removeFunctionFilter(key) and appendFilter() instead.',
        v: '85.0'
    });
    const source = parseFilter(filter);
    return appendFilter(source?.removeFunctionFilter(key), newFilter);
}

/** @deprecated Use `filter.removeFunctionFilter(key)` and `appendFilter()` instead. */
export function replaceFilterByKey(
    filter: FilterLike,
    replacement: FilterLike,
    key: string
): Filter {
    apiDeprecated('replaceFilterByKey', {
        msg: 'Use filter.removeFunctionFilter(key) and appendFilter() instead.',
        v: '85.0'
    });
    const source = parseFilter(filter);
    return appendFilter(source?.removeFunctionFilter(key), replacement);
}

/** @deprecated Use `filter.removeFieldFilters()` / `filter.removeFunctionFilters()` and
 * `appendFilter()` instead. */
export function withFilterByTypes(
    filter: Filter,
    newFilter: FilterLike,
    types: Some<string>
): Filter {
    apiDeprecated('withFilterByTypes', {
        msg: 'Use filter.removeFieldFilters() / filter.removeFunctionFilters() and appendFilter() instead.',
        v: '85.0'
    });
    const typeArr = castArray(types);
    let source: Filter = filter;
    for (const type of typeArr) {
        if (!source) break;
        if (type === 'FieldFilter') source = source.removeFieldFilters();
        if (type === 'FunctionFilter') source = source.removeFunctionFilters();
    }
    return appendFilter(source, newFilter);
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
export function combineValueFilters<T extends FilterLike>(filters: T[] = []): T[] {
    const groupMap = groupBy(filters as FieldFilterSpec[], ({op, field}) => `${op}|${field}`);
    return flatMap(groupMap, filters => {
        return filters.length > 1 && FieldFilter.ARRAY_OPERATORS.includes(filters[0].op)
            ? {...filters[0], value: flatMap(filters, it => it.value)}
            : filters;
    }) as T[];
}
