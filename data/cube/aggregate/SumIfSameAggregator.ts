/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {PlainObject} from '@xh/hoist/core';
import type {AggregationContext} from './AggregationContext';
import {Aggregator} from './Aggregator';
import type {ViewLeafRow, ViewRow} from '../ViewRow';

/**
 * Sums numeric values across all leaf rows, but only if every leaf with a value shares the same
 * value for a second field - for example, amounts that share a currency. Returns null if those
 * leaves disagree, or if no leaf has a value. Values of the second field are compared by identity,
 * so should be strings, numbers or null - a null counts as a value of its own.
 *
 * Reads the second field from each leaf's source record, so the query need not include it. Not
 * supported where the query groups by the summed field itself - the second field is not checked
 * across those groups.
 *
 * Each row tracks one value of the second field - the most common among its leaves - with a count
 * of the leaves holding it, a count of all leaves with a value, and their total. The row has a
 * single shared value when the two counts are equal. An update to a leaf adjusts these in constant
 * time, except when the last leaf holding the tracked value changes and others remain - the row
 * then walks its leaves to choose a new value to track. A full aggregation also walks the leaves.
 *
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
        const counts = new Map<any, number>(),
            state: SumIfSameState = {match: null, matchCount: 0, count: 0, total: 0};
        this.collect(rows, fieldName, context, counts, state);

        counts.forEach((matchCount, match) => {
            if (matchCount > state.matchCount) Object.assign(state, {match, matchCount});
        });

        context.setAggState(state);
        return this.result(state);
    }

    override replace(rows, currVal, update, context) {
        const state: SumIfSameState = context.getAggState();
        if (!state) return super.replace(rows, currVal, update, context);

        const {leafOldData, leafNewData, field} = update;
        this.adjust(state, leafOldData, field.name, -1);
        this.adjust(state, leafNewData, field.name, 1);

        // Reset once no leaf contributes, so fractional amounts net to exactly zero.
        if (!state.count) state.total = 0;

        // The tracked value is gone, but other leaves remain - choose a new one.
        if (!state.matchCount && state.count) return this.aggregate(rows, field.name, context);

        return this.result(state);
    }

    //------------------
    // Implementation
    //------------------
    private result(state: SumIfSameState): number {
        const {count, matchCount, total} = state;
        return count && matchCount === count ? total : null;
    }

    // Add (sign 1) or remove (sign -1) a leaf's contribution.
    private adjust(state: SumIfSameState, data: PlainObject, fieldName: string, sign: number) {
        const val = data[fieldName];
        if (val == null) return;
        state.count += sign;
        state.total += sign * val;
        if (data[this.matchField] === state.match) state.matchCount += sign;
    }

    private collect(
        rows: ViewRow[],
        fieldName: string,
        context: AggregationContext,
        counts: Map<any, number>,
        state: SumIfSameState
    ) {
        for (const row of rows) {
            // Descend only into rows that aggregated the field - see `getAggState()`.
            if (!row.isLeaf && context.getAggState(row)) {
                this.collect(row.children, fieldName, context, counts, state);
                continue;
            }

            // A leaf, or a row that did not aggregate the field - read its values directly.
            const data = row.isLeaf ? (row as ViewLeafRow).cubeRecord.data : row.data,
                val = data[fieldName];
            if (val == null) continue;

            const match = data[this.matchField];
            counts.set(match, (counts.get(match) ?? 0) + 1);
            state.count++;
            state.total += val;
        }
    }
}

interface SumIfSameState {
    /** Value of the match field tracked by this row - the most common when last chosen. */
    match: any;
    /** Number of contributing leaves whose match field holds `match`. */
    matchCount: number;
    /** Number of contributing leaves - those with a non-null value. */
    count: number;
    /** Sum of contributing values. */
    total: number;
}
