/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {sortBy} from 'lodash';
import {Aggregator} from './Aggregator';

/**
 * Takes the median of numeric values across all leaf rows, skipping nulls. Returns null if no leaf
 * has a value.
 *
 * Suited to measures such as percentage returns, where one outlier would pull an average far from
 * the typical value.
 *
 * Walks every leaf beneath the row on each call. A median cannot be composed from the medians of
 * child groups, nor adjusted by swapping one value, so neither aggregator state nor a
 * {@link replace} override applies. The cost of each row's aggregation grows with its leaf count.
 */
export class MedianAggregator extends Aggregator {
    override aggregate(rows, fieldName) {
        const vals: number[] = [];
        this.forEachLeaf(rows, leaf => {
            const val = leaf.data[fieldName];
            if (val != null) vals.push(val);
        });
        if (!vals.length) return null;

        // Not native `sort()`, which compares as strings and puts 10 before 9.
        const sorted = sortBy(vals),
            mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
}
