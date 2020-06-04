/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */


/**
 * An object specifying a Filter to be applied to a Store.
 */
export class StoreFilter {

    /** @type {function} */
    fn;

    /** @type {boolean} */
    includeChildren;

    /**
     * @param {Object} config
     * @param {StoreFilterFunction} config.fn - function taking a record and returning a boolean.
     * @param {boolean} [config.includeChildren] - true if all children of a passing record should
     *      also be considered passing (default false).
     */
    constructor({fn, includeChildren = false}) {
        this.fn = fn;
        this.includeChildren = includeChildren;
    }
}

/**
 * @callback StoreFilterFunction
 * @param {Record} - record to evaluate
 * @return {boolean} - true if the Record passes the filter and should be included in the Store's
 *      filtered records collection.
 */