/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
/**
 * Correctness suite for the pure pivot lattice engine. Run with:
 *   npx tsx data/cube/impl/PivotLattice.spec.ts
 *
 * hoist-react has no general test framework configured, so (matching the mcp/data/*.spec.ts style)
 * this is a self-contained, exit-coded driver, exiting 1 on any failure.
 *
 * Every scenario is checked against `PivotReference`, which computes each cell's leaf set from
 * first principles. Three properties are asserted per scenario:
 *
 *   1. Populated - the lattice materializes a cell exactly where the reference finds leaves.
 *   2. Partition - each cell's children are a strict partition of its own leaf set, down both the
 *      group and pivot axes. This is what makes every Cube aggregator correct by construction.
 *   3. Exactly-once - a leaf change credits each affected group row and cell precisely one time,
 *      via disjoint `parent` / `pivotParent` routes. This is the double-counting guard.
 *
 * The `Aggregator` classes carry no decorators and only type-level framework imports, so they load
 * standalone here too. They are covered over duck-typed rows: `aggregate` / `replace` semantics per
 * aggregator, the same two checked against an independent oracle across a transition matrix, and
 * every aggregator run bottom-up over the lattice's own children to prove property 2 is sufficient.
 * Routing those updates through real `BaseRow` instances needs a browser and lives in the Toolbox
 * tier.
 */
import {isEqual} from 'lodash';
import type {Aggregator} from '../aggregate/Aggregator';
import {AverageAggregator} from '../aggregate/AverageAggregator';
import {AverageStrictAggregator} from '../aggregate/AverageStrictAggregator';
import {ChildCountAggregator} from '../aggregate/ChildCountAggregator';
import {SumAggregator} from '../aggregate/SumAggregator';
import {SumStrictAggregator} from '../aggregate/SumStrictAggregator';
import {UniqueAggregator} from '../aggregate/UniqueAggregator';
import {
    buildPivotLattice,
    CHILD_KIND_LEAF,
    discoverPivotPaths,
    pivotCellFieldName,
    PATH_DELIMITER,
    type PivotLatticeResult,
    type PivotLatticeSpec
} from './PivotLattice';
import {
    buildReferenceGroupTree,
    groupAncestry,
    referenceLeafSets,
    type ReferenceGroupTree
} from './PivotReference';

interface Rec {
    data: Record<string, any>;
}

interface Scenario {
    name: string;
    groupDims: string[];
    pivotDims: string[];
    records: Rec[];
}

//------------------
// Harness
//------------------
let passed = 0;
const failures: string[] = [];

function check(name: string, errs: string[]) {
    if (errs.length) {
        failures.push(name);
        console.log(`✗ ${name}`);
        errs.forEach(e => console.log(`    ${e}`));
    } else {
        passed++;
        console.log(`✓ ${name}`);
    }
}

function expectThrows(name: string, fn: () => void, expectMsg: string) {
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

function arrEq(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

/** Cap a long failure list, so a broad matrix reports its first hits rather than burying them. */
function capped(errs: string[], n = 8): string[] {
    return errs.length > n ? [...errs.slice(0, n), `... and ${errs.length - n} more`] : errs;
}

//------------------
// Fixtures
//------------------
function rec(fund: string, strategy: string, region: any, sector: any, ccy?: any): Rec {
    return {data: {fund, strategy, region, sector, ccy, pnl: 1}};
}

// Deterministic pseudo-random, so the sparse scenario is reproducible run to run. Uses imul and
// discards low bits - a plain `s * a` LCG loses precision past 2^53 and collapses to a few values.
function lcg(seed: number) {
    let s = seed >>> 0;
    return (n: number) => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return (s >>> 8) % n;
    };
}

function sparseRecords(count: number): Rec[] {
    const next = lcg(42),
        funds = ['F1', 'F2', 'F3'],
        strategies = ['S1', 'S2'],
        regions = ['US', 'EU', 'APAC', 'LATAM'],
        sectors = ['Equity', 'Credit', 'Rates'],
        ret: Rec[] = [];

    for (let i = 0; i < count; i++) {
        ret.push(
            rec(
                funds[next(funds.length)],
                strategies[next(strategies.length)],
                regions[next(regions.length)],
                sectors[next(sectors.length)]
            )
        );
    }
    return ret;
}

const BASE: Rec[] = [
    rec('F1', 'S1', 'US', 'Equity', 'USD'),
    rec('F1', 'S1', 'US', 'Credit', 'USD'),
    rec('F1', 'S1', 'EU', 'Equity', 'EUR'),
    rec('F1', 'S2', 'US', 'Equity', 'USD'),
    rec('F1', 'S2', 'APAC', 'Rates', 'JPY'),
    rec('F2', 'S1', 'EU', 'Credit', 'EUR'),
    rec('F2', 'S1', 'EU', 'Credit', 'GBP'),
    rec('F2', 'S2', 'US', 'Rates', 'USD'),
    rec('F3', 'S1', 'APAC', 'Equity', 'JPY')
];

const SCENARIOS: Scenario[] = [
    {
        name: 'single pivot dim, 2 group levels',
        groupDims: ['fund', 'strategy'],
        pivotDims: ['region'],
        records: BASE
    },
    {
        name: 'two pivot dims - exercises pivotParent and pivot totals',
        groupDims: ['fund', 'strategy'],
        pivotDims: ['region', 'sector'],
        records: BASE
    },
    {
        name: 'three pivot dims',
        groupDims: ['fund', 'strategy'],
        pivotDims: ['region', 'sector', 'ccy'],
        records: BASE
    },
    {
        name: 'single group level, two pivot dims',
        groupDims: ['fund'],
        pivotDims: ['region', 'sector'],
        records: BASE
    },
    {
        name: 'no group dims - root is innermost, cells are value totals',
        groupDims: [],
        pivotDims: ['region', 'sector'],
        records: BASE
    },
    {
        name: 'null and blank pivot values form their own path segment',
        groupDims: ['fund'],
        pivotDims: ['region', 'sector'],
        records: [
            rec('F1', 'S1', 'US', 'Equity'),
            rec('F1', 'S1', null, 'Equity'),
            rec('F1', 'S1', '', 'Credit'),
            rec('F1', 'S1', undefined, null),
            rec('F2', 'S1', 'US', ''),
            rec('F2', 'S1', null, null)
        ]
    },
    {
        name: 'values containing the path delimiter and escape char',
        groupDims: ['fund'],
        pivotDims: ['region'],
        records: [
            rec('F1', 'S1', 'A>>B', 'Equity'),
            rec('F1', 'S1', 'A>B', 'Equity'),
            rec('F1', 'S1', 'A', 'Equity'),
            rec('F1', 'S1', 'A\\>B', 'Equity'),
            rec('F1', 'S1', '\\e', 'Equity'),
            rec('F1', 'S1', 'A\\', 'Equity'),
            rec('F2', 'S1', '', 'Equity')
        ]
    },
    {
        name: 'sparse - 400 records over a wide cross product',
        groupDims: ['fund', 'strategy'],
        pivotDims: ['region', 'sector'],
        records: sparseRecords(400)
    },
    {
        name: 'numeric and mixed-type pivot values',
        groupDims: ['fund'],
        pivotDims: ['region'],
        records: [
            rec('F1', 'S1', 10, 'Equity'),
            rec('F1', 'S1', 2, 'Equity'),
            rec('F1', 'S1', 100, 'Equity'),
            rec('F2', 'S1', 2, 'Equity'),
            rec('F2', 'S1', true, 'Equity'),
            rec('F2', 'S1', null, 'Equity')
        ]
    }
];

//------------------
// Scenario assembly
//------------------
interface Built {
    tree: ReferenceGroupTree;
    spec: PivotLatticeSpec;
    lattice: PivotLatticeResult;
    paths: ReturnType<typeof discoverPivotPaths>;
}

function build(s: Scenario): Built {
    const paths = discoverPivotPaths(s.records, s.pivotDims),
        tree = buildReferenceGroupTree(s.records, s.groupDims);

    const spec: PivotLatticeSpec = {
        groupCount: tree.groupCount,
        parentOfGroup: tree.parentOfGroup,
        innermost: tree.innermost,
        leafOwnerGroup: tree.leafOwnerGroup,
        leafPathIdx: paths.pathIdxOfRecord,
        pathCount: paths.paths.length,
        pathParentIdx: paths.pathParentIdx,
        pathDepth: paths.pathDepth,
        maxDepth: paths.maxDepth
    };

    return {tree, spec, lattice: buildPivotLattice(spec), paths};
}

/** Leaf set implied by a cell's children, plus any leaf double-counted across them. */
function derivedLeafSet(
    lat: PivotLatticeResult,
    cell: number
): {leaves: number[]; dupes: number[]} {
    const seen = new Set<number>(),
        dupes: number[] = [];

    const walk = (c: number) => {
        const start = lat.childStart[c],
            end = lat.childStart[c + 1];
        if (lat.cellChildKind[c] === CHILD_KIND_LEAF) {
            for (let i = start; i < end; i++) {
                const leaf = lat.childIdx[i];
                if (seen.has(leaf)) dupes.push(leaf);
                seen.add(leaf);
            }
        } else {
            for (let i = start; i < end; i++) walk(lat.childIdx[i]);
        }
    };

    walk(cell);
    return {leaves: Array.from(seen).sort((a, b) => a - b), dupes};
}

//------------------
// 1 + 2) Populated and partition, against the reference
//------------------
for (const s of SCENARIOS) {
    const errs: string[] = [];
    const {spec, lattice, paths, tree} = build(s);
    const ref = referenceLeafSets(spec);

    // Every populated non-root (group, path) pair must have exactly one cell, and no others.
    const expectKeys = new Set<number>();
    ref.forEach((_v, key) => {
        if (key % spec.pathCount !== 0) expectKeys.add(key);
    });

    const gotKeys = new Set<number>();
    for (let c = 0; c < lattice.cellCount; c++) {
        const key = lattice.cellGroup[c] * spec.pathCount + lattice.cellPath[c];
        if (gotKeys.has(key)) errs.push(`duplicate cell for key ${key}`);
        gotKeys.add(key);
    }

    expectKeys.forEach(k => {
        if (!gotKeys.has(k)) {
            errs.push(
                `missing cell: group ${Math.floor(k / spec.pathCount)} (${
                    tree.groupKey[Math.floor(k / spec.pathCount)]
                }), path "${paths.paths[k % spec.pathCount].key}"`
            );
        }
    });
    gotKeys.forEach(k => {
        if (!expectKeys.has(k)) errs.push(`unpopulated cell present for key ${k}`);
    });

    // Each cell's children must strictly partition its reference leaf set.
    for (let c = 0; c < lattice.cellCount && errs.length < 10; c++) {
        const key = lattice.cellGroup[c] * spec.pathCount + lattice.cellPath[c],
            expected = ref.get(key) ?? [],
            {leaves, dupes} = derivedLeafSet(lattice, c);

        if (dupes.length) {
            errs.push(`cell ${c} double-counts leaves [${dupes.slice(0, 5)}]`);
        }
        if (!arrEq(leaves, expected)) {
            errs.push(
                `cell ${c} (group ${lattice.cellGroup[c]}, path "${
                    paths.paths[lattice.cellPath[c]].key
                }") leaves [${leaves.slice(0, 8)}] != reference [${expected.slice(0, 8)}]`
            );
        }
    }

    // `C(G, rootPath)` *is* G, never a cell of its own. The pivot-axis depth guard relies on this.
    for (let c = 0; c < lattice.cellCount; c++) {
        if (lattice.cellPath[c] === 0) {
            errs.push(`cell ${c} materializes the root path, which must be the group row itself`);
            break;
        }
    }

    check(`populated + partition: ${s.name}`, errs);
}

//------------------
// 3) Exactly-once propagation
//------------------
for (const s of SCENARIOS) {
    const errs: string[] = [];
    const {spec, lattice, paths} = build(s);

    for (let leaf = 0; leaf < spec.leafOwnerGroup.length && errs.length < 6; leaf++) {
        const groupHits = new Map<number, number>(),
            cellHits = new Map<number, number>();

        // Group axis: the leaf's own `parent` chain.
        groupAncestry(spec.leafOwnerGroup[leaf], spec.parentOfGroup).forEach(g =>
            groupHits.set(g, (groupHits.get(g) ?? 0) + 1)
        );

        // Pivot axis: the leaf's `pivotParent` cell, then each cell's two links.
        const visitCell = (c: number) => {
            if (c < 0) return;
            cellHits.set(c, (cellHits.get(c) ?? 0) + 1);
            visitCell(lattice.cellParent[c]);
            visitCell(lattice.cellPivotParent[c]);
        };
        visitCell(lattice.leafPivotParentCell[leaf]);

        // Expected: every ancestor group once; every (ancestor group, non-root path prefix) once.
        const ancestors = groupAncestry(spec.leafOwnerGroup[leaf], spec.parentOfGroup),
            prefixes: number[] = [];
        for (let p = spec.leafPathIdx[leaf]; p > 0; p = spec.pathParentIdx[p]) prefixes.push(p);

        ancestors.forEach(g => {
            if (groupHits.get(g) !== 1) {
                errs.push(
                    `leaf ${leaf}: group ${g} credited ${groupHits.get(g) ?? 0}x, expected 1`
                );
            }
        });
        if (groupHits.size !== ancestors.length) {
            errs.push(
                `leaf ${leaf}: credited ${groupHits.size} groups, expected ${ancestors.length}`
            );
        }

        const expectCells = new Set<number>();
        ancestors.forEach(g =>
            prefixes.forEach(p => {
                const c = lattice.cellOfKey.get(g * spec.pathCount + p);
                if (c == null) {
                    errs.push(`leaf ${leaf}: no cell for group ${g} path "${paths.paths[p].key}"`);
                } else {
                    expectCells.add(c);
                }
            })
        );

        expectCells.forEach(c => {
            if (cellHits.get(c) !== 1) {
                errs.push(
                    `leaf ${leaf}: cell ${c} (group ${lattice.cellGroup[c]}, path "${
                        paths.paths[lattice.cellPath[c]].key
                    }") credited ${cellHits.get(c) ?? 0}x, expected 1`
                );
            }
        });
        cellHits.forEach((n, c) => {
            if (!expectCells.has(c)) {
                errs.push(`leaf ${leaf}: unexpected cell ${c} credited ${n}x`);
            }
        });
    }

    check(`exactly-once propagation: ${s.name}`, errs);
}

//------------------
// Path discovery: ordering, labels, key injectivity
//------------------
{
    const errs: string[] = [],
        records = [
            rec('F1', 'S1', 'US', 'x'),
            rec('F1', 'S1', 'APAC', 'x'),
            rec('F1', 'S1', null, 'x'),
            rec('F1', 'S1', 'EU', 'x')
        ],
        {paths} = discoverPivotPaths(records, ['region']);

    const labels = paths.filter(p => p.depth === 1).map(p => p.label);
    if (!arrEqStr(labels, ['APAC', 'EU', 'US', '(empty)'])) {
        errs.push(`expected ascending with empty last, got [${labels}]`);
    }
    check('path ordering: ascending by value, empty segment last', errs);
}

{
    const errs: string[] = [],
        records = [rec('F1', 'S1', 10, 'x'), rec('F1', 'S1', 2, 'x'), rec('F1', 'S1', 100, 'x')],
        {paths} = discoverPivotPaths(records, ['region']),
        labels = paths.filter(p => p.depth === 1).map(p => p.label);

    if (!arrEqStr(labels, ['2', '10', '100'])) {
        errs.push(`numbers must sort numerically, got [${labels}]`);
    }
    check('path ordering: numeric values sort numerically, not lexically', errs);
}

{
    const errs: string[] = [];
    for (const s of SCENARIOS) {
        const {paths} = discoverPivotPaths(s.records, s.pivotDims),
            keys = new Map<string, number>();
        paths.forEach(p => {
            if (keys.has(p.key)) {
                errs.push(
                    `${s.name}: key "${p.key}" collides (paths ${keys.get(p.key)}, ${p.idx})`
                );
            }
            keys.set(p.key, p.idx);
        });
    }
    check('path keys are injective across every scenario', errs);
}

{
    const errs: string[] = [],
        records = [rec('F1', 'S1', 'US', 'x')],
        {paths} = discoverPivotPaths(records, ['region']),
        root = paths[0],
        us = paths.find(p => p.label === 'US');

    if (root.key !== '') errs.push(`root key should be '', got "${root.key}"`);
    if (pivotCellFieldName(root.key, 'pnl') !== 'pnl') {
        errs.push(
            `root cell field should be the bare value field, got "${pivotCellFieldName(root.key, 'pnl')}"`
        );
    }
    if (pivotCellFieldName(us.key, 'pnl') !== `US${PATH_DELIMITER}pnl`) {
        errs.push(`got "${pivotCellFieldName(us.key, 'pnl')}"`);
    }
    check('cell field naming: root path binds to the bare value field', errs);
}

{
    const errs: string[] = [],
        records = [rec('F1', 'S1', 'US', 'x'), rec('F1', 'S1', null, 'x')],
        {paths} = discoverPivotPaths(records, ['region'], {emptyPathLabel: 'N/A'}),
        empty = paths.find(p => p.isEmpty);

    if (empty?.label !== 'N/A') errs.push(`emptyPathLabel ignored, got "${empty?.label}"`);
    if (empty?.key === '') errs.push('empty path key must not collide with the root key');
    check('emptyPathLabel is honored and keeps a distinct key', errs);
}

//------------------
// Guards
//------------------
expectThrows(
    'maxPivotPaths throws, naming the dimension and count',
    () => {
        const records: Rec[] = [];
        for (let i = 0; i < 50; i++) records.push(rec('F1', 'S1', `R${i}`, 'x'));
        discoverPivotPaths(records, ['region'], {maxPivotPaths: 10});
    },
    'region'
);

{
    const errs: string[] = [];
    const records: Rec[] = [];
    for (let i = 0; i < 50; i++) records.push(rec('F1', 'S1', `R${i}`, 'x'));
    try {
        discoverPivotPaths(records, ['region'], {maxPivotPaths: null});
    } catch (e) {
        errs.push(`null maxPivotPaths should disable the check: ${(e as Error).message}`);
    }
    check('maxPivotPaths: null disables the guard', errs);
}

expectThrows(
    'mixed leaf and group children are rejected',
    () => {
        // Group 0 has a group child (1) and, illegally, leaves of its own.
        buildPivotLattice({
            groupCount: 2,
            parentOfGroup: Int32Array.from([-1, 0]),
            innermost: Uint8Array.from([1, 1]),
            leafOwnerGroup: Int32Array.from([0, 1]),
            leafPathIdx: Int32Array.from([1, 1]),
            pathCount: 2,
            pathParentIdx: Int32Array.from([-1, 0]),
            pathDepth: Int32Array.from([0, 1]),
            maxDepth: 1
        });
    },
    'both leaf and group children'
);

//------------------
// Degenerate cases
//------------------
{
    const errs: string[] = [],
        {lattice, paths} = build({
            name: 'none',
            groupDims: ['fund'],
            pivotDims: [],
            records: BASE
        });

    if (lattice.cellCount !== 0) errs.push(`expected 0 cells, got ${lattice.cellCount}`);
    if (paths.paths.length !== 1) errs.push(`expected root path only, got ${paths.paths.length}`);
    if (paths.maxDepth !== 0) errs.push(`expected maxDepth 0, got ${paths.maxDepth}`);
    check('empty pivotDimensions degenerates to zero cells', errs);
}

{
    const errs: string[] = [],
        {lattice} = build({name: 'none', groupDims: ['fund'], pivotDims: ['region'], records: []});

    if (lattice.cellCount !== 0) errs.push(`expected 0 cells, got ${lattice.cellCount}`);
    check('no records yields zero cells', errs);
}

//------------------
// Aggregator harness
//------------------
const VF = 'v',
    UF = 'u';

const SUM = new SumAggregator(),
    SUM_STRICT = new SumStrictAggregator(),
    AVG = new AverageAggregator(),
    AVG_STRICT = new AverageStrictAggregator(),
    UNIQUE = new UniqueAggregator(),
    CHILD_COUNT = new ChildCountAggregator();

const AGG_NAME = new Map<Aggregator, string>([
    [SUM, 'SUM'],
    [SUM_STRICT, 'SUM_STRICT'],
    [AVG, 'AVG'],
    [AVG_STRICT, 'AVG_STRICT'],
    [UNIQUE, 'UNIQUE'],
    [CHILD_COUNT, 'CHILD_COUNT']
]);

/** Aggregators reading leaf values recursively, rather than their direct children's values. */
const LEAF_DOMAIN = new Set<Aggregator>([AVG, AVG_STRICT]);

function sumOf(vals: any[]): number {
    return vals.reduce((t, v) => (v == null ? t : t + v), 0);
}

/**
 * Expected value per aggregator, computed directly from the value list the aggregator reads. Never
 * routed through an aggregator, so a broken implementation cannot agree with itself - and
 * cross-checked against hand-written literals below, so a broken oracle cannot go unnoticed either.
 */
const ORACLE = new Map<Aggregator, (vals: any[]) => any>([
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

interface AggRow {
    isLeaf: boolean;
    children: AggRow[];
    data: Record<string, any>;
}

function runAggregate(agg: Aggregator, rows: AggRow[], field = VF): any {
    return agg.aggregate(rows as any, field, null);
}

function runReplace(
    agg: Aggregator,
    rows: AggRow[],
    currVal: any,
    oldValue: any,
    newValue: any,
    field = VF
): any {
    const update = {field: {name: field}, oldValue, newValue};
    return agg.replace(rows as any, currVal, update as any, null);
}

function leafOf(val: any, field = VF): AggRow {
    return {isLeaf: true, children: null, data: {[field]: val}};
}

/** Non-leaf row holding its own aggregate over `children`, as the real network materializes it. */
function aggOf(agg: Aggregator, children: AggRow[], field = VF): AggRow {
    return {isLeaf: false, children, data: {[field]: runAggregate(agg, children, field)}};
}

function valEq(a: any, b: any): boolean {
    if (a == null || b == null) return a == null && b == null;
    if (typeof a === 'number' && typeof b === 'number') {
        return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
    }
    return isEqual(a, b);
}

//------------------
// Aggregate semantics
//------------------
{
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
}

{
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
}

{
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
}

{
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
}

{
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
}

//------------------
// Replace semantics - the path an incremental tick drives
//------------------
/** Apply `newVal` at `idx`, then hold both `replace` and a fresh `aggregate` to the oracle. */
function replaceCase(agg: Aggregator, pre: any[], idx: number, newVal: any): string[] {
    const oracle = ORACLE.get(agg),
        rows = pre.map(v => leafOf(v)),
        currAgg = runAggregate(agg, rows),
        post = pre.map((v, i) => (i === idx ? newVal : v)),
        want = oracle(post),
        errs: string[] = [],
        label = `${AGG_NAME.get(agg)} ${JSON.stringify(pre)} #${idx} -> ${JSON.stringify(newVal)}`;

    if (!valEq(currAgg, oracle(pre))) {
        errs.push(`${label}: pre-aggregate ${currAgg} != ${oracle(pre)}`);
    }

    rows[idx].data[VF] = newVal;
    const got = runReplace(agg, rows, currAgg, pre[idx], newVal),
        fresh = runAggregate(agg, rows);

    if (!valEq(got, want)) errs.push(`${label}: replace ${got} != ${want}`);
    if (!valEq(fresh, want)) errs.push(`${label}: aggregate ${fresh} != ${want}`);
    return errs;
}

{
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
}

{
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
}

{
    // The transition that used to delta down to 0 where a rebuild reported null.
    const errs: string[] = [],
        rows = [leafOf(1), leafOf(null)],
        currAgg = runAggregate(SUM, rows);

    rows[0].data[VF] = null;
    const got = runReplace(SUM, rows, currAgg, 1, null);

    if (runAggregate(SUM, rows) !== null) errs.push('an all-null child set must aggregate to null');
    if (got !== null) errs.push(`replace returned ${got}, expected null to match a rebuild`);

    // The zero must still survive when it is a real sum rather than an emptied set.
    const held = [leafOf(5), leafOf(2)],
        heldAgg = runAggregate(SUM, held);
    held[1].data[VF] = -5;
    if (runReplace(SUM, held, heldAgg, 2, -5) !== 0) {
        errs.push('a genuine zero sum must stay 0, not null');
    }

    check('replace: lenient SUM nulls out exactly when aggregate does', errs);
}

{
    const errs: string[] = [],
        rows = [leafOf(1), leafOf(null), leafOf(3)],
        currAgg = runAggregate(SUM_STRICT, rows);

    rows[1].data[VF] = 5;
    const got = runReplace(SUM_STRICT, rows, currAgg, null, 5);

    if (currAgg !== null) errs.push(`a null child must null the strict sum, got ${currAgg}`);
    if (got !== 9) errs.push(`filling the last null must re-aggregate to 9, got ${got}`);
    check('replace: SUM_STRICT re-aggregates out of a null rather than deltaing from it', errs);
}

{
    const errs: string[] = [],
        rows = [leafOf(1), leafOf(2), leafOf(3)],
        currAgg = runAggregate(CHILD_COUNT, rows);

    rows[0].data[VF] = 99;
    if (currAgg !== 3) errs.push(`expected 3 direct children, got ${currAgg}`);
    [99, null].forEach(nv => {
        const got = runReplace(CHILD_COUNT, rows, currAgg, 1, nv);
        if (got !== 3) errs.push(`a values-only tick must leave the count at 3, got ${got}`);
    });
    check('replace: CHILD_COUNT is invariant under a values-only tick', errs);
}

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
        parentAgg = runAggregate(agg, childRows),
        post = groups.map((g, i) => g.map((v, j) => (i === gIdx && j === lIdx ? newVal : v))),
        want = LEAF_DOMAIN.has(agg) ? oracle(post.flat()) : oracle(post.map(g => oracle(g))),
        errs: string[] = [],
        label = `${AGG_NAME.get(agg)} ${JSON.stringify(groups)} g${gIdx}/l${lIdx} -> ${JSON.stringify(newVal)}`;

    const oldChild = childRows[gIdx].data[VF];
    leafRows[gIdx][lIdx].data[VF] = newVal;
    const newChild = runReplace(agg, leafRows[gIdx], oldChild, groups[gIdx][lIdx], newVal);
    childRows[gIdx].data[VF] = newChild;

    if (!valEq(newChild, oracle(post[gIdx]))) {
        errs.push(`${label}: child replace ${newChild} != ${oracle(post[gIdx])}`);
    }

    const got = runReplace(agg, childRows, parentAgg, oldChild, newChild),
        fresh = runAggregate(agg, childRows);

    if (!valEq(got, want)) errs.push(`${label}: parent replace ${got} != ${want}`);
    if (!valEq(fresh, want)) errs.push(`${label}: parent aggregate ${fresh} != ${want}`);
    return errs;
}

{
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
}

//------------------
// Aggregation over the lattice - property 2 is sufficient for every aggregator
//------------------
/** Deterministic per-leaf values: `v` carries nulls, `u` repeats per path so some cells collapse. */
function valuesFor(built: Built, field: string): any[] {
    const {leafPathIdx, leafOwnerGroup} = built.spec,
        ret: any[] = [];
    for (let i = 0; i < leafOwnerGroup.length; i++) {
        if (field === UF) {
            const p = leafPathIdx[i];
            ret.push(p % 3 === 0 ? null : `P${p}`);
        } else {
            ret.push(i % 5 === 2 ? null : i + 1);
        }
    }
    return ret;
}

interface LatticeAgg {
    cellRows: AggRow[];
    groupRows: AggRow[];
    childGroupsOf: number[][];
    leavesOf: number[][];
}

/** Run `agg` bottom-up over the lattice's own children - every cell, plus every group row. */
function aggregateLattice(agg: Aggregator, built: Built, vals: any[], field: string): LatticeAgg {
    const {spec, lattice} = built,
        {groupCount, parentOfGroup, leafOwnerGroup} = spec,
        leafRows = vals.map(v => leafOf(v, field)),
        childGroupsOf: number[][] = Array.from({length: groupCount}, () => []),
        leavesOf: number[][] = Array.from({length: groupCount}, () => []);

    for (let g = 0; g < groupCount; g++) {
        if (parentOfGroup[g] >= 0) childGroupsOf[parentOfGroup[g]].push(g);
    }
    for (let l = 0; l < leafOwnerGroup.length; l++) leavesOf[leafOwnerGroup[l]].push(l);

    // Children always carry a higher index than their parent, down both axes - so descending index
    // is a valid bottom-up walk for cells and for groups alike.
    const cellRows: AggRow[] = new Array(lattice.cellCount);
    for (let c = lattice.cellCount - 1; c >= 0; c--) {
        const isLeafKind = lattice.cellChildKind[c] === CHILD_KIND_LEAF,
            kids: AggRow[] = [];
        for (let i = lattice.childStart[c]; i < lattice.childStart[c + 1]; i++) {
            kids.push(isLeafKind ? leafRows[lattice.childIdx[i]] : cellRows[lattice.childIdx[i]]);
        }
        cellRows[c] = aggOf(agg, kids, field);
    }

    const groupRows: AggRow[] = new Array(groupCount);
    for (let g = groupCount - 1; g >= 0; g--) {
        const kids = leavesOf[g].length
            ? leavesOf[g].map(l => leafRows[l])
            : childGroupsOf[g].map(cg => groupRows[cg]);
        groupRows[g] = kids.length ? aggOf(agg, kids, field) : null;
    }

    return {cellRows, groupRows, childGroupsOf, leavesOf};
}

for (const s of SCENARIOS) {
    const errs: string[] = [],
        built = build(s),
        {spec, lattice} = built,
        ref = referenceLeafSets(spec);

    for (const [agg, field] of [
        [SUM, VF],
        [SUM_STRICT, VF],
        [AVG, VF],
        [AVG_STRICT, VF],
        [UNIQUE, UF]
    ] as Array<[Aggregator, string]>) {
        const name = AGG_NAME.get(agg),
            vals = valuesFor(built, field),
            oracle = ORACLE.get(agg),
            {cellRows, groupRows} = aggregateLattice(agg, built, vals, field),
            want = (leaves: number[]) => oracle(leaves.map(l => vals[l]));

        for (let g = 0; g < spec.groupCount; g++) {
            const leaves = ref.get(g * spec.pathCount);
            if (!leaves || !groupRows[g]) continue;
            const got = groupRows[g].data[field];
            if (!valEq(got, want(leaves))) {
                errs.push(`${name} group row ${g}: ${got} != ${want(leaves)}`);
            }
        }
        for (let c = 0; c < lattice.cellCount; c++) {
            const leaves = ref.get(lattice.cellGroup[c] * spec.pathCount + lattice.cellPath[c]),
                got = cellRows[c].data[field];
            if (!valEq(got, want(leaves))) {
                errs.push(
                    `${name} cell ${c} (group ${lattice.cellGroup[c]}, path "${
                        built.paths.paths[lattice.cellPath[c]].key
                    }"): ${got} != ${want(leaves)}`
                );
            }
        }
    }
    check(`aggregation composes over the lattice: ${s.name}`, capped(errs));
}

//------------------
// CHILD_COUNT on a cell - the plan's "meaningful rather than broken" claim
//------------------
{
    const errs: string[] = [];
    let strictlyFewer = 0;

    for (const s of SCENARIOS) {
        const built = build(s),
            {spec, lattice} = built,
            {
                groupCount,
                pathCount,
                pathParentIdx,
                pathDepth,
                maxDepth,
                leafOwnerGroup,
                leafPathIdx
            } = spec,
            ref = referenceLeafSets(spec),
            vals = valuesFor(built, VF),
            {cellRows, groupRows, childGroupsOf, leavesOf} = aggregateLattice(
                CHILD_COUNT,
                built,
                vals,
                VF
            );

        const childPathsOf: number[][] = Array.from({length: pathCount}, () => []);
        for (let p = 0; p < pathCount; p++) {
            if (pathParentIdx[p] >= 0) childPathsOf[pathParentIdx[p]].push(p);
        }

        for (let g = 0; g < groupCount; g++) {
            if (!groupRows[g]) continue;
            const want = leavesOf[g].length || childGroupsOf[g].length,
                got = groupRows[g].data[VF];
            if (got !== want) errs.push(`${s.name}: group row ${g}: ${got} != ${want}`);
        }

        for (let c = 0; c < lattice.cellCount; c++) {
            const g = lattice.cellGroup[c],
                p = lattice.cellPath[c],
                ownsLeaves = leavesOf[g].length > 0;

            // Derived from the reference rather than from the lattice's own CSR counts.
            let want: number;
            if (!ownsLeaves) {
                want = childGroupsOf[g].filter(cg => ref.has(cg * pathCount + p)).length;
            } else if (pathDepth[p] < maxDepth) {
                want = childPathsOf[p].filter(cp => ref.has(g * pathCount + cp)).length;
            } else {
                want = 0;
                for (let l = 0; l < leafOwnerGroup.length; l++) {
                    if (leafOwnerGroup[l] === g && leafPathIdx[l] === p) want++;
                }
            }

            const got = cellRows[c].data[VF];
            if (got !== want) {
                errs.push(
                    `${s.name}: cell ${c} (group ${g}, path "${
                        built.paths.paths[p].key
                    }"): ${got} != ${want}`
                );
            }
            if (!ownsLeaves && want < childGroupsOf[g].length) strictlyFewer++;
        }
    }

    if (!strictlyFewer) {
        errs.unshift(
            'no cell counts fewer children than its group row - the claim is untested here'
        );
    }
    check('CHILD_COUNT on a cell counts only the children carrying that path', capped(errs));
}

//------------------
// Report
//------------------
function arrEqStr(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

const total = passed + failures.length;
console.log(`\n${passed}/${total} passed, ${failures.length} failed`);
if (failures.length) {
    console.log('FAILED:', failures.join('; '));
    process.exit(1);
}
