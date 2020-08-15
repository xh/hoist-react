/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';

/**
 * Base class for Filters. Not intended to be created / used directly.
 * @abstract
 */
export class Filter {

    get isFilter() {return true}

    /**
     * @member string -- optional group associated with this filter.  Useful for
     *      components that need to find and identify Filters that they own.
     */
    group;

    /**
     * Generate a complete string representation suitable for consumption by parse().
     * @returns {string}
     */
    serialize() {
        throw XH.exception('Not implemented.');
    }

    /**
     * Return a function that can be used to test a record or object.
     *
     * @param {Store} [store] - if provided, function returned will be a test appropriate
     *      for records of this store.  Otherwise, will be a test appropriate for anonymous
     *      objects.
     * @returns {function} - function taking a record or object and returning a boolean
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
}