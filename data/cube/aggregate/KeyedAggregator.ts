/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {isEmpty, max, mean, min, sum, uniq} from 'lodash';
import type {AggregateRow} from '../row/ParentRow';
import {Aggregator} from './Aggregator';

/** How {@link KeyedAggregator} totals the keys under the root. */
export type KeyedRootAggregator = 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'UNIQUE';

/**
 * Rolls up a value that belongs to a coarser key than the leaves it sits on - such as a fund's NAV,
 * copied onto each of the fund's positions. Summing it would count each fund once per position.
 *
 * - A group row that pins every key field - by its own dimensions, or by single-value `=` clauses
 *   in the query's filter - shows the value its leaves share.
 * - The root totals the value once per distinct key among its leaves, with `rootAggregator`: the
 *   NAV of the funds the View shows. Without a `rootAggregator`, the root is null.
 * - Any other row is null, such as NAV by sector.
 *
 * Reads the key fields from each leaf's source record, so they need not be queried. Takes
 * parameters, so instantiate it per field:
 * `{name: 'nav', aggregator: new KeyedAggregator({keyFields: ['fund'], rootAggregator: 'SUM'})}`.
 */
export class KeyedAggregator extends Aggregator {
    readonly keyFields: string[];
    readonly rootAggregator: KeyedRootAggregator;

    constructor({
        keyFields,
        rootAggregator = null
    }: {
        keyFields: string[];
        rootAggregator?: KeyedRootAggregator;
    }) {
        super();
        throwIf(isEmpty(keyFields), 'KeyedAggregator requires keyFields.');
        this.keyFields = keyFields;
        this.rootAggregator = rootAggregator;
    }

    override get dependsOn() {
        return this.keyFields;
    }

    override aggregate(rows, fieldName, context) {
        const row = context.activeRow,
            pinned = context.view._pinnedDims(row);
        if (!pinned) return null;

        if (this.keyFields.every(it => it in pinned)) {
            const values = uniq(
                rows
                    .map(it => (it.isLeaf ? it.cubeRecord.data : it.data)[fieldName])
                    .filter(it => it != null)
            );
            return values.length === 1 ? values[0] : null;
        }

        return this.rootAggregator && isEmpty((row as AggregateRow).appliedDims)
            ? this.aggregateKeys(rows, fieldName)
            : null;
    }

    //------------------
    // Implementation
    //------------------
    // The value once per distinct key among the leaves, totalled by the root aggregator.
    private aggregateKeys(rows, fieldName): unknown {
        const byKey = new Map<string, unknown>();
        this.forEachLeaf(rows, leaf => {
            const {data} = leaf.cubeRecord,
                value = data[fieldName];
            if (value == null) return;
            const key = JSON.stringify(this.keyFields.map(it => data[it]));
            if (!byKey.has(key)) byKey.set(key, value);
        });
        const values = [...byKey.values()] as number[];
        if (!values.length) return null;
        switch (this.rootAggregator) {
            case 'SUM':
                return sum(values);
            case 'AVG':
                return mean(values);
            case 'MIN':
                return min(values);
            case 'MAX':
                return max(values);
            case 'UNIQUE': {
                const distinct = uniq(values);
                return distinct.length === 1 ? distinct[0] : null;
            }
        }
    }
}
