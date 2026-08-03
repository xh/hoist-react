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
 * hoist-react has no general test framework configured, so (matching the mcp/data/*.spec.ts style) this
 * is a self-contained, exit-coded driver: a table of cases against the pure {@link resolveDrop} engine,
 * exiting 1 on any failure.
 *
 * Every case traces to a rule or captured case in `docs/planning/locked-group-dnd-spec.md`. Add a case
 * here whenever a new drag scenario is captured.
 */
import type {ColumnState} from '@xh/hoist/cmp/grid';
import type {HSide} from '@xh/hoist/core';
import {
    collapseSelection,
    dragSelectionRejectReason,
    invariantHolds,
    isNoOpDrop,
    isValidDragSelection,
    resolveDrop,
    type ChainOf,
    type DragSelectionRow,
    type DropRejectReason,
    type DropTarget,
    type SelectionUnit
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
        // Group-as-single-row (§5B): grp-security has 2 rendered members pinned left (symbol,
        // assetClass); symbol is the top member, so its lower half is still the group's top half →
        // before the group.
        name: 'POS foreign group top member lower half (pinned) -> before the group',
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
        // Dragging the pinned portion toward symbol (before the group) can't leave grp-account, so it
        // rejoins at the group's leading edge and unpins (§5A).
        name: 'C-SPAN outside own portion -> clamp back into own run (rejoin)',
        pins: {portfolio: 'left'},
        side: null,
        moving: ['portfolio'],
        guid: 'grp-account',
        target: 'symbol',
        position: 'below',
        expect: {
            allowed: true,
            left: [],
            verify: st =>
                groupView(st, 'grp-account').join() === 'portfolio,strategy,trader'
                    ? []
                    : [`account order ${groupView(st, 'grp-account')}`]
        }
    },

    // --- intra-bucket leaf validity (spec §5A): clamp to the leaf's own group edge, never reject ---
    {
        // Dragging assetClass down past its group clamps to grp-security's trailing edge - its only
        // legal region - rather than refusing the drop.
        name: 'INTRA leaf out of its group -> clamp to own group edge',
        side: null,
        moving: ['assetClass'],
        target: 'strategy',
        position: 'above',
        expect: {
            allowed: true,
            verify: st =>
                groupView(st, 'grp-security').join() === 'symbol,sector,ccy,side,assetClass'
                    ? []
                    : [`security order ${groupView(st, 'grp-security')}`]
        }
    },
    {
        name: 'INTRA leaf within its group -> allowed',
        side: null,
        moving: ['assetClass'],
        target: 'sector',
        position: 'below',
        expect: {allowed: true}
    },

    // --- §5B group-as-single-row. grp-account has 3 rendered members (portfolio, strategy, trader), so
    // the midpoint flip is at strategy's center; grp-pricing drags up from below, so both before and
    // after are real moves. ---
    {
        // Above the midpoint (strategy's upper half) -> before the whole group.
        name: 'POS foreign group above midpoint -> before the group',
        side: null,
        moving: ['quantity', 'price', 'priceLocal', 'fxRate'],
        guid: 'grp-pricing',
        target: 'strategy',
        position: 'above',
        expect: {
            allowed: true,
            verify: st => {
                const uv = bucketView(st, null);
                return uv.indexOf('portfolio') === uv.indexOf('price') + 1
                    ? []
                    : [`expected grp-pricing right before grp-account, got [${uv.slice(0, 10)}]`];
            }
        }
    },
    {
        // Below the midpoint (strategy's lower half) -> after the whole group.
        name: 'POS foreign group below midpoint -> after the group',
        side: null,
        moving: ['quantity', 'price', 'priceLocal', 'fxRate'],
        guid: 'grp-pricing',
        target: 'strategy',
        position: 'below',
        expect: {
            allowed: true,
            verify: st => {
                const uv = bucketView(st, null);
                return uv.indexOf('quantity') === uv.indexOf('trader') + 1
                    ? []
                    : [`expected grp-pricing right after grp-account, got [${uv.slice(0, 10)}]`];
            }
        }
    },
    {
        // A member wholly in the top half (portfolio, first of 3) resolves to "before" even on its
        // LOWER half - the whole member is above the group's midpoint.
        name: 'POS foreign group top member lower half -> still before the group',
        side: null,
        moving: ['quantity', 'price', 'priceLocal', 'fxRate'],
        guid: 'grp-pricing',
        target: 'portfolio',
        position: 'below',
        expect: {
            allowed: true,
            verify: st => {
                const uv = bucketView(st, null);
                return uv.indexOf('portfolio') === uv.indexOf('price') + 1
                    ? []
                    : [`expected grp-pricing right before grp-account, got [${uv.slice(0, 10)}]`];
            }
        }
    },
    {
        // Clamp to the bucket end: a top-level group dragged past the last row lands at the end of the
        // bucket (the "empty space below the rows" / append case resolves to a real move, §5B).
        name: 'CLAMP top-level group past the last row -> lands at bucket end',
        side: null,
        moving: ['symbol', 'underlyer', 'assetClass', 'sector', 'ccy', 'side'],
        guid: 'grp-security',
        target: 'cs01',
        position: 'below',
        expect: {
            allowed: true,
            verify: st => {
                const uv = bucketView(st, null);
                return uv.slice(-5).join() === 'symbol,assetClass,sector,ccy,side'
                    ? []
                    : [`expected grp-security at bucket end, got [${uv.slice(-6)}]`];
            }
        }
    },
    {
        // Nested clamp-to-parent-edge: dragging the middle subgroup grp-rates up past grp-risk's start
        // clamps it to grp-risk's leading edge (before grp-greeks) - it stays inside grp-risk rather
        // than relocating the whole parent group. Without the clamp, escalation would move all of
        // grp-risk to the front.
        name: 'NEST subgroup up past parent start -> clamp to parent leading edge',
        side: null,
        moving: ['dv01', 'duration'],
        guid: 'grp-rates',
        target: 'symbol',
        position: 'above',
        expect: {
            allowed: true,
            verify: st =>
                groupView(st, 'grp-risk').join() === 'dv01,delta,gamma,cs01'
                    ? []
                    : [`grp-risk order ${groupView(st, 'grp-risk')}`]
        }
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

//------------------
// isValidDragSelection: up-front multi-select gate (target-independent)
//------------------
const leaf = (parentGroupId: string | null, movable = true): DragSelectionRow => ({
    isGroup: false,
    movable,
    parentGroupId
});
const group = (movable = true): DragSelectionRow => ({isGroup: true, movable, parentGroupId: null});

interface SelCase {
    name: string;
    rows: DragSelectionRow[];
    lock?: boolean; // default true
    expect: boolean;
}

const selCases: SelCase[] = [
    {name: 'SEL empty -> invalid', rows: [], expect: false},
    {name: 'SEL single movable leaf -> valid', rows: [leaf('grp-security')], expect: true},
    {
        name: 'SEL single non-movable leaf -> invalid',
        rows: [leaf('grp-security', false)],
        expect: false
    },
    {
        name: 'SEL locked siblings (same parent) -> valid',
        rows: [leaf('grp-security'), leaf('grp-security')],
        expect: true
    },
    {
        name: 'SEL locked non-siblings (different parents) -> invalid',
        rows: [leaf('grp-security'), leaf('grp-account')],
        expect: false
    },
    {
        name: 'SEL unlocked non-siblings -> valid (no contiguity constraint)',
        rows: [leaf('grp-security'), leaf('grp-account')],
        lock: false,
        expect: true
    },
    {
        name: 'SEL locked ungrouped leaves (shared root) -> valid',
        rows: [leaf(null), leaf(null)],
        expect: true
    },
    {
        name: 'SEL any non-movable leaf in selection -> invalid',
        rows: [leaf('grp-security'), leaf('grp-security', false)],
        expect: false
    },
    {name: 'SEL single movable group -> valid', rows: [group()], expect: true},
    {name: 'SEL single all-locked group -> invalid', rows: [group(false)], expect: false},
    {
        name: 'SEL group mixed with another row -> invalid (group drags alone)',
        rows: [group(), leaf('grp-security')],
        expect: false
    }
];

for (const c of selCases) {
    const got = isValidDragSelection(c.rows, c.lock ?? true);
    if (got === c.expect) {
        passed++;
        console.log(`✓ ${c.name}`);
    } else {
        failures.push(c.name);
        console.log(`✗ ${c.name}\n    expected ${c.expect}, got ${got}`);
    }
}

//------------------
// dragSelectionRejectReason: the reason the up-front gate refuses (drives the drag hint)
//------------------
interface ReasonCase {
    name: string;
    rows: DragSelectionRow[];
    lock?: boolean; // default true
    expect: DropRejectReason | null;
}

const reasonCases: ReasonCase[] = [
    {name: 'REASON empty -> null (no drag to explain)', rows: [], expect: null},
    {name: 'REASON valid single leaf -> null', rows: [leaf('grp-security')], expect: null},
    {
        name: 'REASON non-movable leaf -> notMovable',
        rows: [leaf('grp-security', false)],
        expect: 'notMovable'
    },
    {
        name: 'REASON group mixed with a row -> groupDraggedWithOthers',
        rows: [group(), leaf('grp-security')],
        expect: 'groupDraggedWithOthers'
    },
    {
        name: 'REASON locked non-siblings -> multiGroupSelection',
        rows: [leaf('grp-security'), leaf('grp-account')],
        expect: 'multiGroupSelection'
    },
    {
        name: 'REASON unlocked non-siblings -> null',
        rows: [leaf('grp-security'), leaf('grp-account')],
        lock: false,
        expect: null
    }
];

for (const c of reasonCases) {
    const got = dragSelectionRejectReason(c.rows, c.lock ?? true);
    if (got === c.expect) {
        passed++;
        console.log(`✓ ${c.name}`);
    } else {
        failures.push(c.name);
        console.log(`✗ ${c.name}\n    expected ${c.expect}, got ${got}`);
    }
}

//------------------
// collapseSelection: subsume rows contained in a selected group (redundant multi-select)
//------------------
/** Build a SelectionUnit from a fixture id - a group if it has member leaves, else a leaf. */
const unit = (id: string): SelectionUnit => {
    const leaves = NAT_ORDER.filter(c => chainOf(c).includes(id));
    return leaves.length
        ? {id, isGroup: true, leafColIds: leaves}
        : {id, isGroup: false, leafColIds: [id]};
};

interface CollapseCase {
    name: string;
    ids: string[];
    expect: string[];
}

const collapseCases: CollapseCase[] = [
    {
        name: 'COLLAPSE leaf + its group -> group only',
        ids: ['delta', 'grp-greeks'],
        expect: ['grp-greeks']
    },
    {
        name: 'COLLAPSE subgroup + ancestor group -> ancestor only',
        ids: ['grp-greeks', 'grp-risk'],
        expect: ['grp-risk']
    },
    {
        name: 'COLLAPSE group + several of its own children -> group only',
        ids: ['grp-greeks', 'delta', 'gamma'],
        expect: ['grp-greeks']
    },
    {
        name: 'COLLAPSE group + foreign leaf -> both kept',
        ids: ['grp-greeks', 'portfolio'],
        expect: ['grp-greeks', 'portfolio']
    },
    {
        name: 'COLLAPSE two sibling subgroups -> both kept',
        ids: ['grp-greeks', 'grp-rates'],
        expect: ['grp-greeks', 'grp-rates']
    },
    {
        name: 'COLLAPSE two ungrouped leaves -> unchanged',
        ids: ['symbol', 'portfolio'],
        expect: ['symbol', 'portfolio']
    },
    {name: 'COLLAPSE single group -> unchanged', ids: ['grp-greeks'], expect: ['grp-greeks']}
];

for (const c of collapseCases) {
    const got = collapseSelection(c.ids.map(unit)).map(u => u.id);
    if (arrEq(got, c.expect)) {
        passed++;
        console.log(`✓ ${c.name}`);
    } else {
        failures.push(c.name);
        console.log(`✗ ${c.name}\n    expected [${c.expect}], got [${got}]`);
    }
}

//------------------
// C-HIDDEN-GAP: a second fixture mirroring the Toolbox `columnChooser` example - a nested Sales group
// (projected + actual subgroups) followed in master by an all-HIDDEN Compensation group and a trailing
// ungrouped column (retain). That hidden group between the Sales run and retain is what makes these
// cases load-bearing: a drop resolved on raw master indices overshoots across it, splitting Sales.
// See `docs/planning/locked-group-dnd-spec.md` §5A.
//------------------
const CHAIN2: Record<string, string[]> = {
    fullName: ['rep'],
    firstName: ['rep'],
    lastName: ['rep'],
    email: ['rep'],
    city: ['location'],
    state: ['location'],
    region: ['location'],
    salary: [],
    tenure: [],
    projectedUnitsSold: ['sales', 'projected'],
    projectedGross: ['sales', 'projected'],
    actualUnitsSold: ['sales', 'actual'],
    actualGross: ['sales', 'actual'],
    commissionRate: ['compensation'],
    commission: ['compensation'],
    retain: []
};
const NAT2 = Object.keys(CHAIN2);
const HIDDEN2 = new Set([
    'firstName',
    'lastName',
    'email',
    'city',
    'region',
    'tenure',
    'commissionRate',
    'commission'
]);
const PINS2: Record<string, HSide> = {fullName: 'left'};
const chainOf2: ChainOf = c => CHAIN2[c] ?? [];
const isDisplayed2 = (c: string) => !HIDDEN2.has(c);
const master2: ColumnState[] = NAT2.map(colId => ({
    colId,
    width: 100,
    hidden: HIDDEN2.has(colId),
    pinned: PINS2[colId]
}));
const mkTarget2 = (id: string): DropTarget => {
    const leaves = NAT2.filter(c => chainOf2(c).includes(id));
    return leaves.length
        ? {id, isGroup: true, leafColIds: leaves}
        : {id, isGroup: false, leafColIds: [id]};
};
const bucketView2 = (st: ColumnState[], side: HSide | null) =>
    st.filter(cs => (cs.pinned ?? null) === side && !cs.hidden).map(cs => cs.colId);

interface HGCase {
    name: string;
    moving: string[];
    guid?: string | null;
    target: string;
    position: 'above' | 'below';
    expectUnpinned: string[];
}

const hiddenGapCases: HGCase[] = [
    {
        // Projected dropped below the last Actual leaf -> a minimal reorder within Sales, not a
        // relocation of the whole Sales group past Retain.
        name: 'C-HIDDEN-GAP subgroup below sibling subgroup last leaf -> reorder in place',
        moving: ['projectedUnitsSold', 'projectedGross'],
        guid: 'projected',
        target: 'actualGross',
        position: 'below',
        expectUnpinned: [
            'state',
            'salary',
            'actualUnitsSold',
            'actualGross',
            'projectedUnitsSold',
            'projectedGross',
            'retain'
        ]
    },
    {
        // Symmetric direction: Actual dropped above the first Projected leaf -> Actual then Projected,
        // Sales still in place (never jumps the hidden Compensation gap).
        name: 'C-HIDDEN-GAP subgroup above sibling subgroup first leaf -> reorder in place',
        moving: ['actualUnitsSold', 'actualGross'],
        guid: 'actual',
        target: 'projectedUnitsSold',
        position: 'above',
        expectUnpinned: [
            'state',
            'salary',
            'actualUnitsSold',
            'actualGross',
            'projectedUnitsSold',
            'projectedGross',
            'retain'
        ]
    },
    {
        // Foreign to BOTH rendered neighbors, with the hidden Compensation group between Actual Gross
        // and Retain: the drop anchors after the preceding row, never before Retain across the gap.
        name: 'C-HIDDEN-GAP ungrouped leaf below a group, hidden gap before next -> after preceding row',
        moving: ['salary'],
        guid: null,
        target: 'actualGross',
        position: 'below',
        expectUnpinned: [
            'state',
            'projectedUnitsSold',
            'projectedGross',
            'actualUnitsSold',
            'actualGross',
            'salary',
            'retain'
        ]
    },
    {
        // §5B group-as-single-row for an UNGROUPED leaf: retain dragged UP into the Sales group's top
        // half (above its 4-member midpoint) lands before the whole group. Sales has 4 rendered
        // members, so projectedGross (index 1) sits in the top half → before.
        name: 'C-HIDDEN-GAP ungrouped leaf into group top half -> before the group',
        moving: ['retain'],
        guid: null,
        target: 'projectedGross',
        position: 'above',
        expectUnpinned: [
            'state',
            'salary',
            'retain',
            'projectedUnitsSold',
            'projectedGross',
            'actualUnitsSold',
            'actualGross'
        ]
    }
];

for (const c of hiddenGapCases) {
    const errs: string[] = [];
    const res = resolveDrop({
        master: master2,
        chainOf: chainOf2,
        side: null,
        isDisplayed: isDisplayed2,
        lockColumnGroups: true,
        movingLeafColIds: c.moving,
        dragUnitGroupId: c.guid ?? null,
        target: mkTarget2(c.target),
        position: c.position
    });
    if (!res.allowed || !res.state) {
        errs.push(`allowed: expected true, got ${res.allowed}`);
    } else {
        if (!invariantHolds(res.state, chainOf2))
            errs.push('marryChildren invariant VIOLATED (would trigger #39)');
        const got = bucketView2(res.state, null);
        if (!arrEq(got, c.expectUnpinned))
            errs.push(`unpinned view: expected [${c.expectUnpinned}], got [${got}]`);
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

const total =
    cases.length +
    selCases.length +
    reasonCases.length +
    collapseCases.length +
    hiddenGapCases.length;
console.log(`\n${passed}/${total} passed, ${failures.length} failed`);
if (failures.length) {
    console.log('FAILED:', failures.join('; '));
    process.exit(1);
}
