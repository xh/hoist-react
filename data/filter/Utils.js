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
 * @param {(*|Filter|*[])} spec -  one or more filters or configs to create one.
 *
 * If either an existing Filter or null is passed, it will simply be returned.  A null filter
 * will be no filter at all, or the equivalent of a filter that always passes every record.
 *
 * Raw Function will be converted to a FunctionFilter, and Arrays will be converted to
 * a CompoundFilter with a default 'AND'.
 *
 * See `CompoundFilter`, `FieldFilter` and `FunctionFilter` for more information on
 * supported configs.
 *
 * @returns {Filter}
 */
export function parseFilter(spec) {
    // Degenerate cases
    if (!spec || spec.isFilter) return spec;

    // Normalize special forms
    if (isFunction(spec)) spec = {testFn: spec};
    if (isArray(spec)) spec = {filters: spec};

    // Branch on properties
    if (spec.field) {
        return new FieldFilter(spec);
    }
    if (spec.testFn) {
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