/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isEqual} from 'lodash';
import type {Aggregator} from '../aggregate/Aggregator';
import {AverageAggregator} from '../aggregate/AverageAggregator';
import {AverageStrictAggregator} from '../aggregate/AverageStrictAggregator';
import {ChildCountAggregator} from '../aggregate/ChildCountAggregator';
import {SumAggregator} from '../aggregate/SumAggregator';
import {SumStrictAggregator} from '../aggregate/SumStrictAggregator';
import {UniqueAggregator} from '../aggregate/UniqueAggregator';

/**
 * Shared harness for the `data/cube` unit-tier specs - a minimal exit-coded driver plus duck-typed
 * rows and a fake {@link AggregationContext} for exercising `Aggregator` classes standalone.
 *
 * hoist-react has no general test framework: anything importing `View` needs a bundler and babel
 * decorators. The `Aggregator` classes carry neither, so they load under `npx tsx` against these
 * fixtures. Test-only - kept out of `data/index.ts`, like `PivotReference`.
 */

//------------------
// Harness
//------------------
let passed = 0;
const failures: string[] = [];

export function check(name: string, errs: string[]) {
    if (errs.length) {
        failures.push(name);
        console.log(`✗ ${name}`);
        errs.forEach(e => console.log(`    ${e}`));
    } else {
        passed++;
        console.log(`✓ ${name}`);
    }
}

/** Run a block of checks, recording a throw as a failure rather than aborting the remaining suites. */
export function suite(name: string, fn: () => void) {
    try {
        fn();
    } catch (e) {
        check(name, [`threw: ${(e as Error).stack ?? e}`]);
    }
}

export function expectThrows(name: string, fn: () => void, expectMsg: string) {
    const errs: string[] = [];
    try {
        fn();
        errs.push('expected a throw, but none occurred');
    } catch (e) {
        const msg = (e as Error).message ?? String(e);
        if (!msg.includes(expectMsg)) {
            errs.push(`message should include "${expectMsg}", got "${msg}"`);
        }
    }
    check(name, errs);
}

/** Print the summary and exit 1 on any failure. Call last. */
export function report() {
    const total = passed + failures.length;
    console.log(`\n${passed}/${total} passed, ${failures.length} failed`);
    if (failures.length) {
        console.log('FAILED:', failures.join('; '));
        process.exit(1);
    }
}

/** Cap a long failure list, so a broad matrix reports its first hits rather than burying them. */
export function capped(errs: string[], n = 8): string[] {
    return errs.length > n ? [...errs.slice(0, n), `... and ${errs.length - n} more`] : errs;
}

export function arrEq(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

export function arrEqStr(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function valEq(a: any, b: any): boolean {
    if (a == null || b == null) return a == null && b == null;
    if (typeof a === 'number' && typeof b === 'number') {
        return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    }
    return isEqual(a, b);
}

//------------------
// Aggregator fixtures
//------------------
export const VF = 'v',
    UF = 'u';

export const SUM = new SumAggregator(),
    SUM_STRICT = new SumStrictAggregator(),
    AVG = new AverageAggregator(),
    AVG_STRICT = new AverageStrictAggregator(),
    UNIQUE = new UniqueAggregator(),
    CHILD_COUNT = new ChildCountAggregator();

export const AGG_NAME = new Map<Aggregator, string>([
    [SUM, 'SUM'],
    [SUM_STRICT, 'SUM_STRICT'],
    [AVG, 'AVG'],
    [AVG_STRICT, 'AVG_STRICT'],
    [UNIQUE, 'UNIQUE'],
    [CHILD_COUNT, 'CHILD_COUNT']
]);

/** Aggregators reading leaf values recursively, rather than their direct children's values. */
export const LEAF_DOMAIN = new Set<Aggregator>([AVG, AVG_STRICT]);

function sumOf(vals: any[]): number {
    return vals.reduce((t, v) => (v == null ? t : t + v), 0);
}

/**
 * Expected value per aggregator, computed directly from the value list the aggregator reads. Never
 * routed through an aggregator, so a broken implementation cannot agree with itself - and
 * cross-checked against hand-written literals in the aggregator spec, so a broken oracle cannot go
 * unnoticed either.
 */
export const ORACLE = new Map<Aggregator, (vals: any[]) => any>([
    [SUM, vals => (vals.every(v => v == null) ? null : sumOf(vals))],
    [SUM_STRICT, vals => (vals.some(v => v == null) ? null : sumOf(vals))],
    [
        AVG,
        vals => {
            const nn = vals.filter(v => v != null);
            return nn.length ? sumOf(nn) / nn.length : null;
        }
    ],
    [AVG_STRICT, vals => (vals.some(v => v == null) ? null : sumOf(vals) / vals.length)],
    [UNIQUE, vals => (vals.every(v => isEqual(v, vals[0])) ? vals[0] : null)],
    [CHILD_COUNT, vals => vals.length]
]);

/** Duck-typed row - the shape `Aggregator` implementations read. */
export interface AggRow {
    isLeaf: boolean;
    children: AggRow[];
    data: Record<string, any>;
    /** Written by compositional aggregators via the context - see {@link ParentRow.aggStates}. */
    aggStates?: Record<string, any>;
}

/**
 * Stand-in for {@link AggregationContext}: tracks the active row and field, and stores aggregator
 * state on the row, exactly as the real one does. Everything else on the real context needs a View.
 */
class FakeAggregationContext {
    activeRow: AggRow = null;
    activeField: {name: string} = null;

    aggregate(agg: Aggregator, rows: AggRow[], field: string, row: AggRow): any {
        this.activeRow = row;
        this.activeField = {name: field};
        try {
            return agg.aggregate(rows as any, field, this as any);
        } finally {
            this.activeRow = this.activeField = null;
        }
    }

    replace(agg: Aggregator, rows: AggRow[], currVal: any, update: any, row: AggRow): any {
        this.activeRow = row;
        this.activeField = update.field;
        try {
            return agg.replace(rows as any, currVal, update, this as any);
        } finally {
            this.activeRow = this.activeField = null;
        }
    }

    setAggState(state: any) {
        (this.activeRow.aggStates ??= {})[this.activeField.name] = state;
    }

    getAggState(row: AggRow = this.activeRow): any {
        return row.aggStates?.[this.activeField.name];
    }
}

const CONTEXT = new FakeAggregationContext();

export function leafOf(val: any, field = VF): AggRow {
    return {isLeaf: true, children: null, data: {[field]: val}};
}

/** Aggregate `rows` for `field` onto `row` - a throwaway parent unless given, as `replace` needs it. */
export function runAggregate(agg: Aggregator, rows: AggRow[], field = VF, row?: AggRow): any {
    return CONTEXT.aggregate(agg, rows, field, row ?? {isLeaf: false, children: rows, data: {}});
}

/** The members of {@link RowUpdate} an aggregator reads. Leaf values default to the direct ones. */
export interface AggUpdate {
    oldValue: any;
    newValue: any;
    leafOldValue?: any;
    leafNewValue?: any;
}

/**
 * Apply a child value change to `row`'s current aggregate. `row` must be the one `runAggregate`
 * wrote its state to - `replace` reads and updates that state in place. Above the leaf level pass
 * the originating leaf values explicitly, as `ParentRow.applyDataUpdate` carries them through.
 */
export function runReplace(
    agg: Aggregator,
    rows: AggRow[],
    currVal: any,
    row: AggRow,
    {oldValue, newValue, leafOldValue = oldValue, leafNewValue = newValue}: AggUpdate,
    field = VF
): any {
    const update = {field: {name: field}, oldValue, newValue, leafOldValue, leafNewValue};
    return CONTEXT.replace(agg, rows, currVal, update, row);
}

/** Non-leaf row holding its own aggregate over `children`, as the real network materializes it. */
export function aggOf(agg: Aggregator, children: AggRow[], field = VF): AggRow {
    const row: AggRow = {isLeaf: false, children, data: {}};
    row.data[field] = runAggregate(agg, children, field, row);
    return row;
}
