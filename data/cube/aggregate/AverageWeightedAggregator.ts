/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {PlainObject} from '@xh/hoist/core';
import {Aggregator} from './Aggregator';

/**
 * Averages numeric values across all leaf rows, weighting each by the value of a second field on
 * its source record - e.g. a price field weighted by quantity. Leaves with a null value or null
 * weight are skipped. Returns null if the weights sum to zero. A child row grouped by the
 * averaged field contributes its published value and weight instead, so the weight field must
 * then also be queried, with `SUM`.
 *
 * Composes from its direct children via a running weighted total and total weight held as
 * aggregator state, as {@link AverageAggregator} does - with the same floating-point caveat that
 * {@link replace} adjusts those totals by leaf deltas without re-deriving them. The totals are
 * reset once no leaves contribute, so fractional weights net to exactly zero.
 *
 * Weights are signed by default, so a group whose weights net toward zero returns an average of
 * extreme magnitude - e.g. a price weighted by quantity across offsetting long and short
 * positions. Pass `{absolute: true}` to weight by magnitude instead.
 *
 * Takes parameters, so is not a singleton like the token-aliased aggregators. Instantiate it
 * per field: `{name: 'price', aggregator: new AverageWeightedAggregator('quantity')}`.
 */
export class AverageWeightedAggregator extends Aggregator {
    readonly weightField: string;
    readonly absolute: boolean;
    private readonly _dependsOn: string[];

    constructor(weightField: string, {absolute = false}: {absolute?: boolean} = {}) {
        super();
        this.weightField = weightField;
        this.absolute = absolute;
        this._dependsOn = [weightField];
    }

    override get dependsOn() {
        return this._dependsOn;
    }

    override aggregate(rows, fieldName, context) {
        let total = 0,
            weight = 0,
            count = 0;

        for (const row of rows) {
            const state = row.isLeaf ? null : context.getAggState(row);
            if (state) {
                total += state.total;
                weight += state.weight;
                count += state.count;
            } else {
                // A leaf, or (rare) a child grouped by this field - just read value and weight.
                const data = row.isLeaf ? row.cubeRecord.data : row.data,
                    val = data[fieldName],
                    w = this.getWeight(data);
                if (val != null && w != null) {
                    total += val * w;
                    weight += w;
                    count++;
                }
            }
        }

        context.setAggState({total, weight, count});
        return weight ? total / weight : null;
    }

    override replace(rows, currAgg, update, context) {
        const state = context.getAggState();
        if (!state) return super.replace(rows, currAgg, update, context);

        const {leafOldValue, leafNewValue, leafOldData, leafNewData} = update,
            oldW = this.getWeight(leafOldData),
            newW = this.getWeight(leafNewData);

        if (leafOldValue != null && oldW != null) {
            state.total -= leafOldValue * oldW;
            state.weight -= oldW;
            state.count--;
        }
        if (leafNewValue != null && newW != null) {
            state.total += leafNewValue * newW;
            state.weight += newW;
            state.count++;
        }
        if (!state.count) state.total = state.weight = 0;

        const {total, weight} = state;
        return weight ? total / weight : null;
    }

    /** Weight for a leaf's source data - null to skip the leaf. */
    protected getWeight(data: PlainObject): number {
        const w = data[this.weightField];
        return this.absolute && w != null ? Math.abs(w) : w;
    }
}
