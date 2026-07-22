/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
/**
 * Regression corpus for the column-chooser locked-group drop engine. Run with:
 *   npx tsx desktop/cmp/grid/impl/colchooser/colChooserDropEngine.spec.ts
 *
 * hoist-react has no general test framework configured, so (matching the mcp/data/*.spec.ts style)
 * this is a self-contained, exit-coded driver: it runs a table of cases against the pure
 * {@link resolveDrop} engine, prints pass/fail per case, and exits 1 on any failure.
 *
 * Every case traces to `docs/planning/locked-group-dnd-spec.md` (§5A rules, §10A captured cases C-F1..C-SPAN). Each
 * allowed locked drop is additionally asserted #39-free via {@link invariantHolds} (ag-Grid's
 * marryChildren). Add a case here whenever a new drag scenario is captured. No browser/Toolbox needed.
 */
import type {ColumnState} from '@xh/hoist/cmp/grid';
import type {HSide} from '@xh/hoist/core';
import {
    invariantHolds,
    isNoOpDrop,
    resolveDrop,
    type ChainOf,
    type DropTarget
} from './colChooserDropEngine';

//------------------
// Fixtures: the Toolbox test-grid group tree (nested grp-pnl/grp-risk), natural order + hidden set.
//------------------
const CHAIN: Record<string, string[]> = {
    symbol: ['grp-security'],
    underlyer: ['grp-security'],
    assetClass: ['grp-security'],
    sector: ['grp-security'],
    ccy: ['grp-security'],
    side: ['grp-security'],
    portfolio: ['grp-account'],
    subPortfolio: ['grp-account'],
    strategy: ['grp-account'],
    trader: ['grp-account'],
    tradeDate: ['grp-trade'],
    maturityDate: ['grp-trade'],
    quantity: ['grp-pricing'],
    price: ['grp-pricing'],
    priceLocal: ['grp-pricing'],
    fxRate: ['grp-pricing'],
    marketValue: ['grp-valuation'],
    notional: ['grp-valuation'],
    cost: ['grp-valuation'],
    grossExposure: ['grp-exposure'],
    netExposure: ['grp-exposure'],
    portfolioWeight: ['grp-exposure'],
    pnlTotalDaily: ['grp-pnl', 'grp-pnl-total'],
    pnlTotalMtd: ['grp-pnl', 'grp-pnl-total'],
    pnlTotalYtd: ['grp-pnl', 'grp-pnl-total'],
    pnlTotalItd: ['grp-pnl', 'grp-pnl-total'],
    delta: ['grp-risk', 'grp-greeks'],
    gamma: ['grp-risk', 'grp-greeks'],
    vega: ['grp-risk', 'grp-greeks'],
    theta: ['grp-risk', 'grp-greeks'],
    dv01: ['grp-risk', 'grp-rates'],
    duration: ['grp-risk', 'grp-rates'],
    cs01: ['grp-risk', 'grp-credit']
};
const NAT_ORDER = Object.keys(CHAIN);
const HIDDEN = new Set([
    'underlyer',
    'subPortfolio',
    'priceLocal',
    'fxRate',
    'cost',
    'portfolioWeight',
    'vega',
    'theta',
    'duration'
]);

const chainOf: ChainOf = colId => CHAIN[colId] ?? [];

// Displayed predicate equivalent to the old `showHidden: false` - hidden columns are routed to the
// library, so not rendered in a bucket. (No Store filter is exercised here; that path is covered live.)
const isDisplayed = (colId: string) => !HIDDEN.has(colId);

function buildMaster(pins: Record<string, HSide> = {}): ColumnState[] {
    return NAT_ORDER.map(colId => ({
        colId,
        width: 100,
        hidden: HIDDEN.has(colId),
        pinned: pins[colId]
    }));
}

/** A group id (has member leaves) becomes a group target; otherwise a leaf target. */
function mkTarget(id: string): DropTarget {
    const leaves = NAT_ORDER.filter(c => chainOf(c).includes(id));
    return leaves.length
        ? {id, isGroup: true, leafColIds: leaves}
        : {id, isGroup: false, leafColIds: [id]};
}

/** Rendered (non-hidden) colIds of a bucket, in master order. */
const bucketView = (st: ColumnState[], side: HSide | null) =>
    st.filter(cs => (cs.pinned ?? null) === side && !cs.hidden).map(cs => cs.colId);
/** Rendered (non-hidden) members of a group across all buckets, in master order. */
const groupView = (st: ColumnState[], groupId: string) =>
    st.filter(cs => !cs.hidden && chainOf(cs.colId).includes(groupId)).map(cs => cs.colId);

//------------------
// Cases
//------------------
interface Case {
    name: string;
    pins?: Record<string, HSide>;
    side: HSide | null; // target bucket
    moving: string[];
    guid?: string | null; // dragged group id (null = leaf drag)
    target: string | null; // colId or groupId; null = no in-bucket target
    position?: 'above' | 'below';
    makeVisible?: boolean;
    lock?: boolean; // default true
    expect: {
        allowed: boolean;
        left?: string[];
        unpinned?: string[];
        right?: string[];
        noOp?: boolean;
        /** Targeted checks: return failure messages (empty = pass). */
        verify?: (st: ColumnState[]) => string[];
    };
}

const cases: Case[] = [
    // --- §10A C-F1/F2/S3: foreign vs sibling leaf, below/above a lone spanning member ---
    {
        name: 'C-F1 foreign leaf below spanning member -> after group',
        pins: {symbol: 'left'},
        side: 'left',
        moving: ['tradeDate'],
        target: 'symbol',
        position: 'below',
        expect: {allowed: true, left: ['symbol', 'tradeDate']}
    },
    {
        name: 'C-F2 foreign leaf above -> before group',
        pins: {symbol: 'left'},
        side: 'left',
        moving: ['tradeDate'],
        target: 'symbol',
        position: 'above',
        expect: {allowed: true, left: ['tradeDate', 'symbol']}
    },
    {
        name: 'C-S3 sibling leaf below -> joins group after member',
        pins: {symbol: 'left'},
        side: 'left',
        moving: ['assetClass'],
        target: 'symbol',
        position: 'below',
        expect: {allowed: true, left: ['symbol', 'assetClass']}
    },

    // --- between two pinned groups; flip snap when between two members of a foreign group ---
    {
        name: 'BETWEEN two pinned groups',
        pins: {symbol: 'left', portfolio: 'left'},
        side: 'left',
        moving: ['quantity'],
        target: 'symbol',
        position: 'below',
        expect: {allowed: true, left: ['symbol', 'quantity', 'portfolio']}
    },
    {
        name: 'FLIP between two members of a foreign group -> snap to near edge',
        pins: {symbol: 'left', assetClass: 'left'},
        side: 'left',
        moving: ['quantity'],
        target: 'symbol',
        position: 'below',
        expect: {allowed: true, left: ['quantity', 'symbol', 'assetClass']}
    },

    // --- §10A C-NEST: nested spanning (delta pinned; grp-greeks & grp-risk both span) ---
    {
        name: 'C-NEST foreign leaf below -> after outer group',
        pins: {delta: 'left'},
        side: 'left',
        moving: ['symbol'],
        target: 'delta',
        position: 'below',
        expect: {allowed: true, left: ['delta', 'symbol']}
    },
    {
        name: 'C-NEST inner-group sibling below -> joins inner group',
        pins: {delta: 'left'},
        side: 'left',
        moving: ['gamma'],
        target: 'delta',
        position: 'below',
        expect: {allowed: true, left: ['delta', 'gamma']}
    },
    {
        name: 'C-NEST same-outer-group cousin below -> joins outer group',
        pins: {delta: 'left'},
        side: 'left',
        moving: ['dv01'],
        target: 'delta',
        position: 'below',
        expect: {allowed: true, left: ['delta', 'dv01']}
    },

    // --- §10A C-LIB: library drop = cross-bucket + unhide (foreign hits C-F1) ---
    {
        name: 'C-LIB hidden foreign leaf below -> after group, unhidden',
        pins: {symbol: 'left'},
        side: 'left',
        moving: ['cost'],
        target: 'symbol',
        position: 'below',
        makeVisible: true,
        expect: {allowed: true, left: ['symbol', 'cost']}
    },

    // --- §10A C-N1: group-row drop that is a visible no-op (must be suppressible) ---
    {
        name: 'C-N1 spanning group-row before its group -> visible no-op',
        pins: {symbol: 'left', portfolio: 'left'},
        side: 'left',
        moving: ['symbol'],
        guid: 'grp-security',
        target: 'grp-account',
        position: 'above',
        expect: {allowed: true, noOp: true}
    },

    // --- §10A C-SPAN / 2b: spanning group-row drag is strict to its own portion ---
    {
        name: 'C-SPAN within own portion -> allowed (rejoin)',
        pins: {portfolio: 'left'},
        side: null,
        moving: ['portfolio'],
        guid: 'grp-account',
        target: 'strategy',
        position: 'below',
        expect: {
            allowed: true,
            verify: st =>
                groupView(st, 'grp-account').join() === 'strategy,portfolio,trader'
                    ? []
                    : [`account order ${groupView(st, 'grp-account')}`]
        }
    },
    {
        name: 'C-SPAN outside own portion -> disallowed (strict)',
        pins: {portfolio: 'left'},
        side: null,
        moving: ['portfolio'],
        guid: 'grp-account',
        target: 'symbol',
        position: 'below',
        expect: {allowed: false}
    },

    // --- intra-bucket leaf validity (spec §5) ---
    {
        name: 'INTRA leaf out of its group -> disallowed',
        side: null,
        moving: ['assetClass'],
        target: 'strategy',
        position: 'above',
        expect: {allowed: false}
    },
    {
        name: 'INTRA leaf within its group -> allowed',
        side: null,
        moving: ['assetClass'],
        target: 'sector',
        position: 'below',
        expect: {allowed: true}
    },

    // --- full/fresh group drag stays relaxed (no other rendered member) ---
    {
        name: 'FULL group drag relaxed -> allowed anywhere',
        side: null,
        moving: ['symbol', 'assetClass', 'sector', 'ccy', 'side'],
        guid: 'grp-security',
        target: 'strategy',
        position: 'below',
        expect: {allowed: true}
    },

    // --- unlocked: no contiguity constraint, splits allowed ---
    {
        name: 'UNLOCKED leaf into middle of a foreign group -> splits (allowed)',
        lock: false,
        side: null,
        moving: ['assetClass'],
        target: 'strategy',
        position: 'above',
        expect: {
            allowed: true,
            verify: st => {
                // Unlocked: no snap, so assetClass lands exactly where dropped - immediately before
                // strategy - splitting grp-account (and grp-security), which is legal when unlocked.
                const uv = bucketView(st, null),
                    ai = uv.indexOf('assetClass'),
                    si = uv.indexOf('strategy');
                const split = !invariantHolds(st, chainOf);
                return ai >= 0 && si === ai + 1 && split
                    ? []
                    : [
                          `expected assetClass immediately before strategy with a split, got [${uv.slice(0, 10)}] split=${split}`
                      ];
            }
        }
    }
];

//------------------
// Runner
//------------------
let passed = 0;
const failures: string[] = [];
const arrEq = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

for (const c of cases) {
    const errs: string[] = [];
    const master = buildMaster(c.pins),
        lock = c.lock ?? true,
        res = resolveDrop({
            master,
            chainOf,
            side: c.side,
            isDisplayed,
            lockColumnGroups: lock,
            movingLeafColIds: c.moving,
            dragUnitGroupId: c.guid ?? null,
            target: c.target == null ? null : mkTarget(c.target),
            position: c.position ?? 'above',
            makeVisible: c.makeVisible ?? false
        });

    if (res.allowed !== c.expect.allowed)
        errs.push(`allowed: expected ${c.expect.allowed}, got ${res.allowed}`);

    if (res.allowed && res.state) {
        const st = res.state;
        if (lock && !invariantHolds(st, chainOf))
            errs.push('marryChildren invariant VIOLATED (would trigger #39)');
        for (const side of ['left', null, 'right'] as (HSide | null)[]) {
            const exp =
                side === 'left'
                    ? c.expect.left
                    : side === 'right'
                      ? c.expect.right
                      : c.expect.unpinned;
            if (exp && !arrEq(bucketView(st, side), exp)) {
                errs.push(
                    `${side ?? 'unpinned'} view: expected [${exp}], got [${bucketView(st, side)}]`
                );
            }
        }
        if (c.expect.noOp != null && isNoOpDrop(st, master, isDisplayed) !== c.expect.noOp) {
            errs.push(`noOp: expected ${c.expect.noOp}, got ${!c.expect.noOp}`);
        }
        if (c.expect.verify) errs.push(...c.expect.verify(st));
    }

    if (errs.length) {
        failures.push(c.name);
        console.log(`✗ ${c.name}`);
        errs.forEach(e => console.log(`    ${e}`));
    } else {
        passed++;
        console.log(`✓ ${c.name}`);
    }
}

console.log(`\n${passed}/${cases.length} passed, ${failures.length} failed`);
if (failures.length) {
    console.log('FAILED:', failures.join('; '));
    process.exit(1);
}
