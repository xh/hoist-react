/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PickByOrderAggregator} from './impl/PickByOrderAggregator';

/**
 * The value of the latest leaf, by a second field such as a date - e.g. the latest price of each
 * symbol. Picks the leaf with the greatest `orderField`, read from its source record, so that field
 * need not be queried. Skips leaves with a null value or a null order. On a tie, the leaf met
 * first wins.
 *
 * Takes parameters, so instantiate it per field:
 * `{name: 'price', aggregator: new LastAggregator({orderField: 'date'})}`.
 */
export class LastAggregator extends PickByOrderAggregator {
    protected override beats(a, b): boolean {
        return a > b;
    }
}
