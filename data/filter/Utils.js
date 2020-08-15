/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {castArray, isEmpty, isFunction, compact} from 'lodash';

import {CompoundFilter} from './CompoundFilter';
import {FieldFilter} from './FieldFilter';
import {FunctionFilter} from './FunctionFilter';

export function parseFilters(filters) {
    if (!filters) return [];
    return compact(castArray(filters).map(parseFilter));
}

export function parseFilter(filter) {
    if (!filter || filter.isFilter)             return filter;
    if (isFunction(filter) || filter.testFn)    return FunctionFilter.create(filter);
    if (!isEmpty(filter.filters))               return CompoundFilter.create(filter);

    return FieldFilter.create(filter);
}