/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PickByOrderAggregator} from './impl/PickByOrderAggregator';

/**
 * The value of the earliest leaf, by a second field such as a date - e.g. the earliest price of each
 * symbol. Picks the leaf with the least `orderField`, read from its source record, so that field
 * need not be queried. Skips leaves with a null value or a null order. On a tie, the leaf met
 * first wins.
 *
 * Takes parameters, so instantiate it per field:
 * `{name: 'price', aggregator: new FirstAggregator({orderField: 'date'})}`.
 */
export class FirstAggregator extends PickByOrderAggregator {
    protected override beats(a, b): boolean {
        return a < b;
    }
}
