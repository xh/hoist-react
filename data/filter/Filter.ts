/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {Store} from '../Store';
import {FilterTestFn} from './Types';

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
export abstract class Filter {

    get isFilter() {return true}

    /**
     * Return a function that can be used to test a record or object.
     *
     * @param [store] - if provided, function returned will be appropriate
     *      for testing records of this store. Otherwise, function returned will be appropriate
     *      for testing anonymous objects.
     */
    abstract getTestFn(store?: Store): FilterTestFn

    /** True if the provided other Filter is equivalent to this instance.*/
    abstract equals(other: Filter): boolean
}