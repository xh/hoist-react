/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import {CompoundFilter, FieldFilter, FunctionFilter} from '@xh/hoist/data';
import {isArray, isFunction} from 'lodash';

/**
 * Parse a filter from an object or array representation.
 *
 * @param {(*|Filter|*[])} spec - one or more filters or configs to create one.
 *      * An existing Filter instance will be returned directly as-is.
 *      * A null value will also be returned as-is. A null filter represents no filter at all,
 *        or the equivalent of a filter that always passes every record.
 *      * A raw Function will be converted to a `FunctionFilter`.
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
