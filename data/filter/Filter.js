/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';

/**
 * Base class for Hoist data package Filters.
 * @abstract - not to be created / used directly.
 *
 * @see FieldFilter - filters by comparing the value of a given field to one or more given
 *      candidate values using one of several supported operators.
 * @see FunctionFilter - filters via a custom function specified by the developer or generated
 *      by a component such as StoreFilterField.
 * @see CompoundFilter - combines multiple filters (including other nested CompoundFilters) via
 *      an AND or OR operator.
 */
export class Filter {

    get isFilter() {return true}

    /**
     * Return a function that can be used to test a record or object.
     *
     * @param {Store} [store] - if provided, function returned will be appropriate
     *      for testing records of this store. Otherwise, function returned will be appropriate
     *      for testing anonymous objects.
     * @returns {FilterTestFn} - function taking a Record or Object and returning a boolean.
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

/**
 * @callback FilterTestFn
 * @param {(Object|Record)} candidate - single Hoist Record or plain JS Object to evaluate.
 * @returns {boolean} - true if the candidate passes and should be included in filtered results.
 */
