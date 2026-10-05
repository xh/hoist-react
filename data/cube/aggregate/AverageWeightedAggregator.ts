/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {Aggregator} from './Aggregator';

/**
 * Averages numeric values across all leaf rows, weighting each by the value of a second field on
 * its source record - e.g. a price field weighted by quantity. Leaves with a null value or null
 * weight are skipped. Returns null if the weights sum to zero.
 *
 * Composes from its direct children via a running weighted total and total weight held as
 * aggregator state, as {@link AverageAggregator} does - with the same floating-point caveat that
 * {@link replace} adjusts those totals by leaf deltas without re-deriving them.
 *
 * Takes a parameter, so is not a singleton like the token-aliased aggregators. Instantiate it
 * per field: `{name: 'price', aggregator: new AverageWeightedAggregator('quantity')}`.
 */
export class AverageWeightedAggregator extends Aggregator {
    readonly weightField: string;

    constructor(weightField: string) {
        super();
        this.weightField = weightField;
    }

    override get dependsOn() {
        return [this.weightField];
    }

    override aggregate(rows, fieldName, context) {
        const {weightField} = this;
        let total = 0,
            weight = 0;

        for (const row of rows) {
            if (row.isLeaf) {
                // Simple case, weights present in leaf
                const {data} = row.cubeRecord,
                    val = data[fieldName],
                    w = data[weightField];
                if (val != null && w != null) {
                    total += val * w;
                    weight += w;
                }
            } else {
                // A child row that is not a leaf that has no state is a null
                const state = context.getAggState(row);
                if (state) {
                    total += state.total;
                    weight += state.weight;
                }
            }
        }

        // Store rich state for parent re-calc
        context.setAggState({total, weight});
        return weight ? total / weight : null;
    }

    override replace(rows, currAgg, update, context) {
        const state = context.getAggState();
        if (!state) return super.replace(rows, currAgg, update, context);

        const {weightField} = this,
            {leafOldValue, leafNewValue, leafOldData, leafNewData} = update,
            oldW = leafOldData[weightField],
            newW = leafNewData[weightField];

        if (leafOldValue != null && oldW != null) {
            state.total -= leafOldValue * oldW;
            state.weight -= oldW;
        }
        if (leafNewValue != null && newW != null) {
            state.total += leafNewValue * newW;
            state.weight += newW;
        }

        const {total, weight} = state;
        return weight ? total / weight : null;
    }
}
