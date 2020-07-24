/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

/**
 * Base class for Filters. Not intended to be created / used directly.
 */
export class Filter {

    get isFilter() {return true}

    /**
     * Generate a complete string representation suitable for consumption by parse().
     * @returns {string}
     */
    serialize() {
        throw new Error('Filter.serialize() not implemented. Use a Filter subclass instead.');
    }

    /**
     * Evaluates a Record or Object.
     * @param {(Record|Object)} v - Record or Object to evaluate
     * @returns {boolean}
     */
    test(v) {
        throw new Error('Filter.test() not implemented. Use a Filter subclass instead.');
    }

    /**
     * Should two Filters be considered equal?
     * @returns {boolean}
     */
    equals(other) {
        throw new Error('Filter.equals() not implemented. Use a Filter subclass instead.');
    }
}