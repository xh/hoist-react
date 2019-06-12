/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */


/**
 * An object specifying a Filter to be applied to a Store.
 */
export class StoreFilter {

    fn;
    includeChildren;

    /**
     * @param {Object} config
     * @param {function} config.fn - function taking a record and returning a boolean.
     * @param {boolean} [config.includeChildren] - true if all children of a passing record should also be considered
     *      passing (default false)
     */
    constructor({fn, includeChildren = false}) {
        this.fn = fn;
        this.includeChildren = includeChildren;
    }
}


