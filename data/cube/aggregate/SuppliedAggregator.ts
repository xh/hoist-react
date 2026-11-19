/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

/**
 * Reads each group row's value from the aggregates supplied to its Cube, for a measure that only
 * the data source can roll up - such as VaR, or a return over a window. Leaf rows keep their own
 * values.
 *
 * A group row reads the value supplied for the dimension values that define its leaves - see
 * {@link SuppliedAggregate} and {@link View.suppliedGroupingSets}. The value is null if none was
 * supplied, and on bucket rows, pivot cells and Views whose filter cannot be expressed that way.
 */
export class SuppliedAggregator extends Aggregator {
    override aggregate(rows, fieldName, context) {
        return context.view._getSuppliedValue(context.activeRow, fieldName);
    }
}
