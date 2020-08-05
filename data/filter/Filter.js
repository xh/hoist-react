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
     * Generate a complete string representation suitable for consumption by parse().
     * @returns {string}
     */
    serialize() {
        throw XH.exception('Not implemented.');
    }

    /**
     * @param {(Record|Object)} v - Record or Object to evaluate
     * @returns {boolean} - true if the provided Record/Object passes the filter.
     */
    test(v) {
        throw XH.exception('Not implemented.');
    }

    /**
     * @returns {boolean} - true if the provided other Filter is equivalent to this instance.
     */
    equals(other) {
        throw XH.exception('Not implemented.');
    }
}