/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */

import {Store} from '../Store';
import {FilterTestFn} from './Types';

/**
 * Base class for Hoist data package Filters.
 *
 * See also:
 *  - {@link FieldFilter} - filters by comparing the value of a given field to one or more given
 *      candidate values using one of several supported operators.
 *  - {@link FunctionFilter} - filters via a custom function specified by the developer or generated
 *      by a component such as StoreFilterField.
 *  - {@link CompoundFilter} - combines multiple filters (including other nested CompoundFilters)
 *      via an `AND` or `OR` operator.
 */
export abstract class Filter {
    get isFilter() {
        return true;
    }

    /**
     * @returns a function that can be used to test a record or object.
     * @param store - if provided, return will be appropriate for testing records of this store.
     *      Otherwise, return will be appropriate for testing anonymous objects.
     */
    abstract getTestFn(store?: Store): FilterTestFn;

    /** @returns true if the provided other Filter is equivalent to this instance.*/
    abstract equals(other: Filter): boolean;
}
