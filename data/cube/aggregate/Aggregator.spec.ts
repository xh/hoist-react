/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
/**
 * Correctness suite for the built-in `Aggregator` classes. Run with `pnpm test:unit`, or directly:
 *   npx tsx data/cube/aggregate/Aggregator.spec.ts
 *
 * Covers `aggregate` / `replace` semantics per aggregator over duck-typed rows, checked against an
 * independent oracle across a transition matrix, and two-level composition - a leaf change updating
 * its group's aggregate, which then becomes the update the parent's `replace` sees. Routing updates
 * through real `BaseRow` instances needs a browser and lives in the Toolbox tier.
 */
import type {Aggregator} from './Aggregator';
import {
    AGG_NAME,
    aggOf,
    AVG,
    AVG_STRICT,
    capped,
    check,
    CHILD_COUNT,
    LEAF_DOMAIN,
    leafOf,
    ORACLE,
    report,
    runAggregate,
    runReplace,
    SUM,
    SUM_STRICT,
    suite,
    UNIQUE,
    valEq,
    VF
} from '../impl/SpecSupport';

//------------------
// Aggregate semantics
//------------------
suite('aggregate: strict variants null out where lenient ones skip', () => {
    const errs: string[] = [],
        cases: Array<[Aggregator, any[], any]> = [
            [SUM, [1, 2, 3], 6],
            [SUM, [1, null, 3], 4],
            [SUM, [null, null], null],
            [SUM_STRICT, [1, 2, 3], 6],
            [SUM_STRICT, [1, null, 3], null],
            [SUM_STRICT, [1, 2, null], null],
            [SUM_STRICT, [0, 0], 0],
            [AVG, [1, 2, 3], 2],
            [AVG, [1, null, 3], 2],
            [AVG, [null, null], null],
            [AVG_STRICT, [1, 2, 3], 2],
            [AVG_STRICT, [1, null, 3], null],
            [AVG_STRICT, [null, null], null],
            [AVG_STRICT, [0, 0], 0],
            [UNIQUE, ['x'], 'x'],
            [UNIQUE, ['x', 'x', 'x'], 'x'],
            [UNIQUE, ['x', 'x', 'y'], null],
            [UNIQUE, ['x', null], null],
            [UNIQUE, [null, null], null],
            [CHILD_COUNT, [1, 2, 3], 3],
            [CHILD_COUNT, [null, null], 2]
        ];

    cases.forEach(([agg, vals, want]) => {
        const name = AGG_NAME.get(agg),
            label = `${name} over ${JSON.stringify(vals)}`,
            got = runAggregate(
                agg,
                vals.map(v => leafOf(v))
            ),
            oracled = ORACLE.get(agg)(vals);

        if (!valEq(got, want)) errs.push(`${label}: got ${got}, expected ${want}`);
        if (!valEq(oracled, want)) errs.push(`${label}: oracle says ${oracled}, expected ${want}`);
    });
    check('aggregate: strict variants null out where lenient ones skip', errs);
});

suite('aggregate: averages weight by leaf, not by direct child', () => {
    const errs: string[] = [],
        wide = aggOf(AVG_STRICT, [leafOf(3), leafOf(3), leafOf(3)]),
        narrow = aggOf(AVG_STRICT, [leafOf(11)]);

    if (wide.data[VF] !== 3 || narrow.data[VF] !== 11) {
        errs.push(`child averages should be 3 and 11, got ${wide.data[VF]} / ${narrow.data[VF]}`);
    }
    // Averaging the two child averages would give 7; weighting by leaf gives 20/4.
    [AVG_STRICT, AVG].forEach(agg => {
        const got = runAggregate(agg, [wide, narrow]);
        if (!valEq(got, 5)) errs.push(`${AGG_NAME.get(agg)}: got ${got}, expected 5`);
    });
    check('aggregate: averages weight by leaf, not by direct child', errs);
});

suite('aggregate: a null leaf nulls a strict average at any depth', () => {
    const errs: string[] = [],
        deep = (vals: any[]) =>
            aggOf(AVG_STRICT, [
                aggOf(
                    AVG_STRICT,
                    vals.map(v => leafOf(v))
                ),
                leafOf(6)
            ]);

    // Null first exercises `forEachLeaf`'s short-circuit; null last exercises the full walk.
    [
        [null, 2],
        [2, null]
    ].forEach(vals => {
        const got = deep(vals).data[VF];
        if (got !== null) errs.push(`${JSON.stringify(vals)} nested: got ${got}, expected null`);
    });
    if (!valEq(deep([2, 4]).data[VF], 4))
        errs.push(`null-free nested: got ${deep([2, 4]).data[VF]}`);
    if (!valEq(runAggregate(AVG, deep([null, 2]).children), 4)) {
        errs.push('lenient AVG should skip the buried null and average 2 and 6');
    }
    check('aggregate: a null leaf nulls a strict average at any depth', errs);
});

suite('aggregate: UNIQUE collapses deeply-equal values to one value, else null', () => {
    const errs: string[] = [],
        got = runAggregate(UNIQUE, [leafOf({a: 1, b: [2]}), leafOf({a: 1, b: [2]})]);

    if (!valEq(got, {a: 1, b: [2]})) errs.push(`deep-equal values should collapse, got ${got}`);
    if (runAggregate(UNIQUE, [leafOf({a: 1}), leafOf({a: 2})]) !== null) {
        errs.push('deep-unequal values must collapse to null');
    }
    if (!valEq(runAggregate(UNIQUE, [leafOf([1, 2]), leafOf([1, 2])]), [1, 2])) {
        errs.push('array values should collapse');
    }
    check('aggregate: UNIQUE collapses deeply-equal values to one value, else null', errs);
});

suite('strict aggregates are null exactly when a leaf beneath them is null', () => {
    // The invariant that makes the strict aggregators' null short-circuits in `replace` safe, and
    // therefore untestable: a strict aggregate is null exactly when a leaf beneath it is null, so
    // short-circuiting on a null child can never differ from re-aggregating.
    const errs: string[] = [],
        shapes: any[][][] = [[[1, 2]], [[1, null]], [[null, null]], [[0, 0]], [[3], [4, null]]];

    [AVG_STRICT, SUM_STRICT].forEach(agg =>
        shapes.forEach(shape => {
            const row = aggOf(
                    agg,
                    shape.map(g =>
                        aggOf(
                            agg,
                            g.map(v => leafOf(v))
                        )
                    )
                ),
                hasNullLeaf = shape.flat().some(v => v == null);

            if ((row.data[VF] == null) !== hasNullLeaf) {
                errs.push(
                    `${AGG_NAME.get(agg)} ${JSON.stringify(shape)}: aggregate ${row.data[VF]}, ` +
                        `null leaf present ${hasNullLeaf}`
                );
            }
        })
    );
    check('strict aggregates are null exactly when a leaf beneath them is null', errs);
});

//------------------
// Replace semantics - the path an incremental tick drives
//------------------
/** Apply `newVal` at `idx`, then hold both `replace` and a fresh `aggregate` to the oracle. */
function replaceCase(agg: Aggregator, pre: any[], idx: number, newVal: any): string[] {
    const oracle = ORACLE.get(agg),
        rows = pre.map(v => leafOf(v)),
        parent = aggOf(agg, rows),
        currAgg = parent.data[VF],
        post = pre.map((v, i) => (i === idx ? newVal : v)),
        want = oracle(post),
        errs: string[] = [],
        label = `${AGG_NAME.get(agg)} ${JSON.stringify(pre)} #${idx} -> ${JSON.stringify(newVal)}`;

    if (!valEq(currAgg, oracle(pre))) {
        errs.push(`${label}: pre-aggregate ${currAgg} != ${oracle(pre)}`);
    }

    rows[idx].data[VF] = newVal;
    const got = runReplace(agg, rows, currAgg, parent, {oldValue: pre[idx], newValue: newVal}),
        fresh = runAggregate(agg, rows);

    if (!valEq(got, want)) errs.push(`${label}: replace ${got} != ${want}`);
    if (!valEq(fresh, want)) errs.push(`${label}: aggregate ${fresh} != ${want}`);
    return errs;
}

suite('replace: numeric aggregators land on the oracle across every transition', () => {
    const errs: string[] = [],
        states: any[][] = [[1, 2, 3], [1, null, 3], [null, null], [5], [0, 0], [1, null, null]],
        newVals = [7, 0, null, -3];

    [SUM, SUM_STRICT, AVG, AVG_STRICT, CHILD_COUNT].forEach(agg =>
        states.forEach(pre =>
            pre.forEach((_v, i) =>
                newVals.forEach(nv => errs.push(...replaceCase(agg, pre, i, nv)))
            )
        )
    );
    check('replace: numeric aggregators land on the oracle across every transition', capped(errs));
});

suite('replace: UNIQUE re-collapses across every transition, including deep values', () => {
    const errs: string[] = [],
        states: any[][] = [
            ['x'],
            ['x', 'x'],
            ['x', 'y'],
            [null, null],
            ['x', null],
            ['x', 'x', 'y'],
            [{a: 1}, {a: 1}],
            [{a: 1}, {a: 2}]
        ],
        newVals = ['x', 'y', null, {a: 1}, {a: 3}];

    states.forEach(pre =>
        pre.forEach((_v, i) => newVals.forEach(nv => errs.push(...replaceCase(UNIQUE, pre, i, nv))))
    );
    check(
        'replace: UNIQUE re-collapses across every transition, including deep values',
        capped(errs)
    );
});

suite('replace: lenient SUM nulls out exactly when aggregate does', () => {
    // The transition that used to delta down to 0 where a rebuild reported null.
    const errs: string[] = [],
        rows = [leafOf(1), leafOf(null)],
        parent = aggOf(SUM, rows),
        currAgg = parent.data[VF];

    rows[0].data[VF] = null;
    const got = runReplace(SUM, rows, currAgg, parent, {oldValue: 1, newValue: null});

    if (runAggregate(SUM, rows) !== null) errs.push('an all-null child set must aggregate to null');
    if (got !== null) errs.push(`replace returned ${got}, expected null to match a rebuild`);

    // The zero must still survive when it is a real sum rather than an emptied set.
    const held = [leafOf(5), leafOf(2)],
        heldParent = aggOf(SUM, held);
    held[1].data[VF] = -5;
    if (runReplace(SUM, held, heldParent.data[VF], heldParent, {oldValue: 2, newValue: -5}) !== 0) {
        errs.push('a genuine zero sum must stay 0, not null');
    }

    check('replace: lenient SUM nulls out exactly when aggregate does', errs);
});

suite('replace: SUM_STRICT re-aggregates out of a null rather than deltaing from it', () => {
    const errs: string[] = [],
        rows = [leafOf(1), leafOf(null), leafOf(3)],
        parent = aggOf(SUM_STRICT, rows),
        currAgg = parent.data[VF];

    rows[1].data[VF] = 5;
    const got = runReplace(SUM_STRICT, rows, currAgg, parent, {oldValue: null, newValue: 5});

    if (currAgg !== null) errs.push(`a null child must null the strict sum, got ${currAgg}`);
    if (got !== 9) errs.push(`filling the last null must re-aggregate to 9, got ${got}`);
    check('replace: SUM_STRICT re-aggregates out of a null rather than deltaing from it', errs);
});

suite('replace: CHILD_COUNT is invariant under a values-only tick', () => {
    const errs: string[] = [],
        rows = [leafOf(1), leafOf(2), leafOf(3)],
        parent = aggOf(CHILD_COUNT, rows),
        currAgg = parent.data[VF];

    rows[0].data[VF] = 99;
    if (currAgg !== 3) errs.push(`expected 3 direct children, got ${currAgg}`);
    [99, null].forEach(nv => {
        const got = runReplace(CHILD_COUNT, rows, currAgg, parent, {oldValue: 1, newValue: nv});
        if (got !== 3) errs.push(`a values-only tick must leave the count at 3, got ${got}`);
    });
    check('replace: CHILD_COUNT is invariant under a values-only tick', errs);
});

/**
 * Two-level `replace`: a leaf change updates its own group's aggregate, and that becomes the update
 * the parent's `replace` sees. This is the group-axis composition every cell relies on; routing the
 * same updates through real rows down two axes at once is the Toolbox tier's job.
 */
function nestedReplaceCase(
    agg: Aggregator,
    groups: any[][],
    gIdx: number,
    lIdx: number,
    newVal: any
): string[] {
    const oracle = ORACLE.get(agg),
        leafRows = groups.map(g => g.map(v => leafOf(v))),
        childRows = leafRows.map(rows => aggOf(agg, rows)),
        parent = aggOf(agg, childRows),
        parentAgg = parent.data[VF],
        post = groups.map((g, i) => g.map((v, j) => (i === gIdx && j === lIdx ? newVal : v))),
        want = LEAF_DOMAIN.has(agg) ? oracle(post.flat()) : oracle(post.map(g => oracle(g))),
        errs: string[] = [],
        label = `${AGG_NAME.get(agg)} ${JSON.stringify(groups)} g${gIdx}/l${lIdx} -> ${JSON.stringify(newVal)}`;

    const oldChild = childRows[gIdx].data[VF],
        oldLeaf = groups[gIdx][lIdx];
    leafRows[gIdx][lIdx].data[VF] = newVal;
    const newChild = runReplace(agg, leafRows[gIdx], oldChild, childRows[gIdx], {
        oldValue: oldLeaf,
        newValue: newVal
    });
    childRows[gIdx].data[VF] = newChild;

    if (!valEq(newChild, oracle(post[gIdx]))) {
        errs.push(`${label}: child replace ${newChild} != ${oracle(post[gIdx])}`);
    }

    // The parent sees the child's delta, with the leaf values carried through as `RowUpdate` does.
    const got = runReplace(agg, childRows, parentAgg, parent, {
            oldValue: oldChild,
            newValue: newChild,
            leafOldValue: oldLeaf,
            leafNewValue: newVal
        }),
        fresh = runAggregate(agg, childRows);

    if (!valEq(got, want)) errs.push(`${label}: parent replace ${got} != ${want}`);
    if (!valEq(fresh, want)) errs.push(`${label}: parent aggregate ${fresh} != ${want}`);
    return errs;
}

suite('replace: composes a group aggregate up into its parent aggregate', () => {
    const errs: string[] = [],
        shapes: any[][][] = [
            [[1, 2], [3], [4, 5]],
            [[1, null], [3], [4]],
            [[1, 2, 3], [4]],
            [[null], [null, null]]
        ],
        uniqueShapes: any[][][] = [
            [['x', 'x'], ['x']],
            [['x', 'y'], ['x']],
            [['x'], [null, null]]
        ];

    [SUM, SUM_STRICT, AVG, AVG_STRICT, CHILD_COUNT].forEach(agg =>
        shapes.forEach(shape =>
            shape.forEach((g, gi) =>
                g.forEach((_v, li) =>
                    [9, null, 0].forEach(nv =>
                        errs.push(...nestedReplaceCase(agg, shape, gi, li, nv))
                    )
                )
            )
        )
    );
    uniqueShapes.forEach(shape =>
        shape.forEach((g, gi) =>
            g.forEach((_v, li) =>
                ['x', 'z', null].forEach(nv =>
                    errs.push(...nestedReplaceCase(UNIQUE, shape, gi, li, nv))
                )
            )
        )
    );
    check('replace: composes a group aggregate up into its parent aggregate', capped(errs));
});

report();
