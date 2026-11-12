/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {isEqual} from 'lodash';
import {Aggregator} from './Aggregator';

/**
 * Sums numeric values across all leaf rows, but only if every leaf with a value shares the same
 * value for a second field - for example, amounts that share a currency. Returns null if those
 * leaves disagree, or if no leaf has a value. A null in the second field counts as a value of its
 * own.
 *
 * Reads the second field from each leaf's source record, so the query need not include it.
 * Create one per field: `{name: 'amount', aggregator: new SumIfSameAggregator('currency')}`.
 */
export class SumIfSameAggregator extends Aggregator {
    readonly matchField: string;
    private readonly _dependsOn: string[];

    constructor(matchField: string) {
        super();
        this.matchField = matchField;
        this._dependsOn = [matchField];
    }

    override get dependsOn() {
        return this._dependsOn;
    }

    override aggregate(rows, fieldName, context) {
        let total: number = null,
            shared: any = null,
            mixed = false;

        for (const row of rows) {
            let val: number, rowShared: any;

            // Compose from child state, not the children's published `UNIQUE` values - two children
            // with mixed values both publish null, and would wrongly agree.
            const state: SumIfSameState = row.isLeaf ? null : context.getAggState(row);
            if (state) {
                if (state.mixed) {
                    mixed = true;
                    break;
                }
                val = state.total;
                rowShared = state.shared;
            } else {
                // A leaf, or a row that did not aggregate the field - read its values directly.
                const data = row.isLeaf ? row.cubeRecord.data : row.data;
                val = data[fieldName];
                rowShared = data[this.matchField];
            }

            if (val == null) continue;
            if (total != null && !isEqual(rowShared, shared)) {
                mixed = true;
                break;
            }
            shared = rowShared;
            total += val;
        }

        if (mixed) total = shared = null;
        context.setAggState({total, shared, mixed});
        return total;
    }
}

interface SumIfSameState {
    /** Sum of contributing values, or null if none contributed or they disagreed. */
    total: number;
    /** Value of the match field shared by all contributing leaves. */
    shared: any;
    /** True if contributing leaves disagreed on the match field. */
    mixed: boolean;
}
