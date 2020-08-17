/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {CompoundFilter} from './CompoundFilter';
import {FieldFilter} from './FieldFilter';
import {FunctionFilter} from './FunctionFilter';

import {isFunction, isArray} from 'lodash';

/**
 * Parse a filter from an object or array representation.
 *
 * @param {(*|Filter)} filter -  one or more filters or configs to create one.  If multiple
 *      filters are passed, they will be joined into a single 'AND' filter.  If either a
 *      Filter or null are passed, they will simply be returned.
 * @returns {Filter}
 */
export function parseFilter(filter) {
    if (!filter || filter.isFilter) return filter;
    if (isFunction(filter) || filter.testFn) return FunctionFilter.create(filter);
    if (isArray(filter) || filter.filters) return CompoundFilter.create(filter);
    if (filter.field) return FieldFilter.create(filter);

    console.error('Unable to identify filter');
    return null;
}