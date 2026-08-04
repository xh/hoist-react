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
 */
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
