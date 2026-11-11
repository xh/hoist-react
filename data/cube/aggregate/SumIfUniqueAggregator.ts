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
 * value for a second field. For example, it sums amounts only where they share a currency.
 * Returns null if those leaves disagree, so a total never mixes units, and null if no leaf has a
 * value.
 *
 * Only leaves with a non-null value take part in the check. A leaf with no amount adds nothing,
 * so its currency cannot make the total ambiguous. A null in the second field counts as a value
 * of its own, distinct from all others.
 *
 * Composes from its direct children via a running total and shared value held as aggregator
 * state, so the check covers every leaf beneath a row at any depth of grouping. Reading a
 * child's published `UNIQUE` value for the second field would not: a child with mixed values
 * publishes null, and two such children would wrongly agree.
 *
 * Reads the second field from each leaf's source record, so the query need not include it.
 * Takes parameters, so is not a singleton like the token-aliased aggregators. Instantiate it per
 * field: `{name: 'amount', aggregator: new SumIfUniqueAggregator('currency')}`.
 */
export class SumIfUniqueAggregator extends Aggregator {
    readonly uniqueField: string;
    private readonly _dependsOn: string[];

    constructor(uniqueField: string) {
        super();
        this.uniqueField = uniqueField;
        this._dependsOn = [uniqueField];
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

            const state: SumIfUniqueState = row.isLeaf ? null : context.getAggState(row);
            if (state) {
                if (state.mixed) {
                    mixed = true;
                    break;
                }
                val = state.total;
                rowShared = state.shared;
            } else {
                // A leaf, or a rare child grouped by this field - read both values directly.
                const data = row.isLeaf ? row.cubeRecord.data : row.data;
                val = data[fieldName];
                rowShared = data[this.uniqueField];
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

interface SumIfUniqueState {
    /** Sum of contributing values, or null if none contributed or they disagreed. */
    total: number;
    /** Value of the unique field shared by all contributing leaves. */
    shared: any;
    /** True if contributing leaves disagreed on the unique field. */
    mixed: boolean;
}
