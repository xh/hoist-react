/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

/** Averages numeric values across all leaf rows, skipping nulls. */
export class AverageAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        let total = null,
            count = 0;

        this.forEachLeaf(rows, leaf => {
            const val = leaf.data[fieldName];
            if (val != null) {
                total += val;
                count++;
            }
        });

        return total != null ? total / count : null;
    }
}
