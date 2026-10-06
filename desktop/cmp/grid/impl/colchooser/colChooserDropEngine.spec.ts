/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ColumnState} from '@xh/hoist/cmp/grid';
import type {HSide} from '@xh/hoist/core';
import {describe, expect, it} from 'vitest';
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
    type DropTarget
} from './colChooserDropEngine';

/**
 * Drag-and-drop rules of the desktop column chooser, run against its pure resolution engine. With
 * `lockColumnGroups`, ag-Grid requires every column group to stay contiguous - a drop that splits
 * one triggers ag-Grid warning #39 and scrambles the user's column order. Each case below is a drag
 * a user can make, captured while building the chooser in #4409. They ran as an ad hoc script until
 * 4d98c3b55, which dropped them for want of a test framework.
 */

//------------------
// Fixture: a trading grid with nested groups (grp-pnl, grp-risk), some columns hidden.
//------------------
const TRADES = fixture(
    {
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
    },
    [
        'underlyer',
        'subPortfolio',
        'priceLocal',
        'fxRate',
        'cost',
        'portfolioWeight',
        'vega',
        'theta',
        'duration'
    ]
);

const PRICING = ['quantity', 'price', 'priceLocal', 'fxRate'],
    SECURITY = ['symbol', 'assetClass', 'sector', 'ccy', 'side'];

describe('resolveDrop', () => {
    describe('with locked column groups', () => {
        it.each<DropCase & {left: string[]}>([
            {
                name: 'places a foreign leaf dropped below a lone group member after the group',
                pins: {symbol: 'left'},
                moving: ['tradeDate'],
                target: 'symbol',
                position: 'below',
                left: ['symbol', 'tradeDate']
            },
            {
                name: 'places a foreign leaf dropped above a lone group member before the group',
                pins: {symbol: 'left'},
                moving: ['tradeDate'],
                target: 'symbol',
                position: 'above',
                left: ['tradeDate', 'symbol']
            },
            {
                name: 'joins a sibling leaf dropped below a group member to that group',
                pins: {symbol: 'left'},
                moving: ['assetClass'],
                target: 'symbol',
                position: 'below',
                left: ['symbol', 'assetClass']
            },
            {
                name: 'places a leaf dropped between two groups between them',
                pins: {symbol: 'left', portfolio: 'left'},
                moving: ['quantity'],
                target: 'symbol',
                position: 'below',
                left: ['symbol', 'quantity', 'portfolio']
            },
            {
                // The top member of a two-member group lies wholly in the group's top half.
                name: 'places a foreign leaf dropped onto the top member of a group before the group',
                pins: {symbol: 'left', assetClass: 'left'},
                moving: ['quantity'],
                target: 'symbol',
                position: 'below',
                left: ['quantity', 'symbol', 'assetClass']
            },
            {
                name: 'places a foreign leaf dropped below a nested group member after the outer group',
                pins: {delta: 'left'},
                moving: ['symbol'],
                target: 'delta',
                position: 'below',
                left: ['delta', 'symbol']
            },
            {
                name: 'joins a leaf dropped below a member of its own inner group to that group',
                pins: {delta: 'left'},
                moving: ['gamma'],
                target: 'delta',
                position: 'below',
                left: ['delta', 'gamma']
            },
            {
                name: 'joins a leaf dropped below a cousin to their shared outer group',
                pins: {delta: 'left'},
                moving: ['dv01'],
                target: 'delta',
                position: 'below',
                left: ['delta', 'dv01']
            },
            {
                name: 'unhides a column dropped from the library, placing it like any leaf',
                pins: {symbol: 'left'},
                moving: ['cost'],
                target: 'symbol',
                position: 'below',
                makeVisible: true,
                left: ['symbol', 'cost']
            }
        ])('$name', ({left, ...drop}) => {
            const {master, state} = resolveLockedDrop(TRADES, {side: 'left', ...drop});
            expect(TRADES.view(state, 'left')).toEqual(left);
            expect(isNoOpDrop(state, master, TRADES.isDisplayed)).toBe(false);
        });

        // A foreign group is a single drop unit, flipping from before to after at its midpoint.
        // grp-account renders 3 members, so the flip falls at the middle of strategy.
        it.each<DropCase & {run: string[]}>([
            {
                name: 'drops a group above the midpoint of a foreign group before that group',
                moving: PRICING,
                group: 'grp-pricing',
                target: 'strategy',
                position: 'above',
                run: ['quantity', 'price', 'portfolio', 'strategy', 'trader']
            },
            {
                name: 'drops a group below the midpoint of a foreign group after that group',
                moving: PRICING,
                group: 'grp-pricing',
                target: 'strategy',
                position: 'below',
                run: ['portfolio', 'strategy', 'trader', 'quantity', 'price']
            },
            {
                name: 'drops a group onto the lower half of a top member before the foreign group',
                moving: PRICING,
                group: 'grp-pricing',
                target: 'portfolio',
                position: 'below',
                run: ['quantity', 'price', 'portfolio', 'strategy', 'trader']
            },
            {
                name: 'moves a whole group to a drop point outside its current run',
                moving: SECURITY,
                group: 'grp-security',
                target: 'strategy',
                position: 'below',
                run: ['portfolio', 'strategy', 'trader', ...SECURITY, 'tradeDate']
            }
        ])('$name', ({run, ...drop}) => {
            const {state} = resolveLockedDrop(TRADES, {side: null, ...drop});
            expect(asRun(TRADES.view(state, null))).toContain(asRun(run));
        });

        it('moves a group dropped past the last row to the end of the bucket', () => {
            const {state} = resolveLockedDrop(TRADES, {
                side: null,
                moving: ['symbol', 'underlyer', 'assetClass', 'sector', 'ccy', 'side'],
                group: 'grp-security',
                target: 'cs01',
                position: 'below'
            });
            expect(TRADES.view(state, null).slice(-6)).toEqual(['cs01', ...SECURITY]);
        });

        // A dragged unit never leaves the innermost group it still shares with rendered columns.
        // A drop outside that group is clamped to its near edge, rather than refused.
        it.each<DropCase & {groupId: string; members: string[]}>([
            {
                name: 'reorders a leaf within its own group',
                moving: ['assetClass'],
                target: 'sector',
                position: 'below',
                groupId: 'grp-security',
                members: ['symbol', 'sector', 'assetClass', 'ccy', 'side']
            },
            {
                name: 'clamps a leaf dropped outside its group to the near edge of the group',
                moving: ['assetClass'],
                target: 'strategy',
                position: 'above',
                groupId: 'grp-security',
                members: ['symbol', 'sector', 'ccy', 'side', 'assetClass']
            },
            {
                name: 'clamps a subgroup dropped outside its parent to the edge of the parent',
                moving: ['dv01', 'duration'],
                group: 'grp-rates',
                target: 'symbol',
                position: 'above',
                groupId: 'grp-risk',
                members: ['dv01', 'delta', 'gamma', 'cs01']
            },
            {
                name: 'rejoins the pinned part of a split group where dropped within its run',
                pins: {portfolio: 'left'},
                moving: ['portfolio'],
                group: 'grp-account',
                target: 'strategy',
                position: 'below',
                groupId: 'grp-account',
                members: ['strategy', 'portfolio', 'trader']
            },
            {
                name: 'clamps the pinned part of a split group dropped outside its run back to the run',
                pins: {portfolio: 'left'},
                moving: ['portfolio'],
                group: 'grp-account',
                target: 'symbol',
                position: 'below',
                groupId: 'grp-account',
                members: ['portfolio', 'strategy', 'trader']
            }
        ])('$name', ({groupId, members, ...drop}) => {
            const {state} = resolveLockedDrop(TRADES, {side: null, ...drop});
            expect(TRADES.groupView(state, groupId)).toEqual(members);
            expect(TRADES.view(state, 'left')).toEqual([]);
        });

        it('reports a group dropped back into its current place as a no-op', () => {
            const {master, state} = resolveLockedDrop(TRADES, {
                pins: {symbol: 'left', portfolio: 'left'},
                side: 'left',
                moving: ['symbol'],
                group: 'grp-security',
                target: 'grp-account',
                position: 'above'
            });
            expect(isNoOpDrop(state, master, TRADES.isDisplayed)).toBe(true);
        });

        it('pins leaves dropped with no target row in place, leaving column order unchanged', () => {
            const {master, state} = resolveLockedDrop(TRADES, {
                side: 'left',
                moving: ['tradeDate'],
                target: null
            });
            expect(state.map(it => it.colId)).toEqual(master.map(it => it.colId));
            expect(TRADES.view(state, 'left')).toEqual(['tradeDate']);
        });
    });

    describe('with unlocked column groups', () => {
        it('places a leaf exactly where it is dropped, splitting groups', () => {
            const master = TRADES.master(),
                {allowed, state} = resolveDrop({
                    ...TRADES.dropInput(master, {
                        side: null,
                        moving: ['assetClass'],
                        target: 'strategy',
                        position: 'above'
                    }),
                    lockColumnGroups: false
                });

            expect(allowed).toBe(true);
            expect(asRun(TRADES.view(state, null))).toContain(
                asRun(['portfolio', 'assetClass', 'strategy'])
            );
            expect(invariantHolds(state, TRADES.chainOf)).toBe(false);
        });
    });

    // A hidden group between rendered rows must not pull a drop across it. Resolving the drop on raw
    // column indices would overshoot the hidden gap and split the Sales group. Modeled on the
    // Toolbox column chooser example.
    describe('with a hidden group between rendered rows', () => {
        const SALES = fixture(
            {
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
            },
            [
                'firstName',
                'lastName',
                'email',
                'city',
                'region',
                'tenure',
                'commissionRate',
                'commission'
            ]
        );

        it.each<DropCase & {unpinned: string[]}>([
            {
                name: 'reorders subgroups in place when one is dropped below the other',
                moving: ['projectedUnitsSold', 'projectedGross'],
                group: 'projected',
                target: 'actualGross',
                position: 'below',
                unpinned: [
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
                name: 'reorders subgroups in place when one is dropped above the other',
                moving: ['actualUnitsSold', 'actualGross'],
                group: 'actual',
                target: 'projectedUnitsSold',
                position: 'above',
                unpinned: [
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
                name: 'places an ungrouped leaf dropped below a group right after the group',
                moving: ['salary'],
                target: 'actualGross',
                position: 'below',
                unpinned: [
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
                name: 'places an ungrouped leaf dropped into the top half of a group before it',
                moving: ['retain'],
                target: 'projectedGross',
                position: 'above',
                unpinned: [
                    'state',
                    'salary',
                    'retain',
                    'projectedUnitsSold',
                    'projectedGross',
                    'actualUnitsSold',
                    'actualGross'
                ]
            }
        ])('$name', ({unpinned, ...drop}) => {
            const {state} = resolveLockedDrop(SALES, {
                pins: {fullName: 'left'},
                side: null,
                ...drop
            });
            expect(SALES.view(state, null)).toEqual(unpinned);
        });
    });
});

describe('isValidDragSelection', () => {
    const leaf = (parentGroupId: string | null, movable = true): DragSelectionRow => ({
            isGroup: false,
            movable,
            parentGroupId
        }),
        group = (movable = true): DragSelectionRow => ({
            isGroup: true,
            movable,
            parentGroupId: null
        });

    it.each<{
        name: string;
        rows: DragSelectionRow[];
        lock?: boolean;
        valid: boolean;
        reason: DropRejectReason;
    }>([
        {name: 'refuses an empty selection', rows: [], valid: false, reason: null},
        {
            name: 'accepts a single movable leaf',
            rows: [leaf('grp-security')],
            valid: true,
            reason: null
        },
        {
            name: 'refuses a non-movable leaf',
            rows: [leaf('grp-security', false)],
            valid: false,
            reason: 'notMovable'
        },
        {
            name: 'refuses a selection including a non-movable leaf',
            rows: [leaf('grp-security'), leaf('grp-security', false)],
            valid: false,
            reason: 'notMovable'
        },
        {
            name: 'accepts sibling leaves of one group',
            rows: [leaf('grp-security'), leaf('grp-security')],
            valid: true,
            reason: null
        },
        {
            name: 'accepts several ungrouped leaves',
            rows: [leaf(null), leaf(null)],
            valid: true,
            reason: null
        },
        {
            name: 'refuses leaves of different groups when groups are locked',
            rows: [leaf('grp-security'), leaf('grp-account')],
            valid: false,
            reason: 'multiGroupSelection'
        },
        {
            name: 'accepts leaves of different groups when groups are unlocked',
            rows: [leaf('grp-security'), leaf('grp-account')],
            lock: false,
            valid: true,
            reason: null
        },
        {name: 'accepts a single movable group', rows: [group()], valid: true, reason: null},
        {
            // A non-movable column still rides along when its group is dragged - see ag-Grid's
            // `suppressMovable` - so only a group with no movable column at all is refused.
            name: 'refuses a group with no movable columns',
            rows: [group(false)],
            valid: false,
            reason: 'notMovable'
        },
        {
            name: 'refuses a group selected together with other rows',
            rows: [group(), leaf('grp-security')],
            valid: false,
            reason: 'groupDraggedWithOthers'
        }
    ])('$name', ({rows, lock = true, valid, reason}) => {
        expect(isValidDragSelection(rows, lock)).toBe(valid);
        expect(dragSelectionRejectReason(rows, lock)).toBe(reason);
    });
});

describe('collapseSelection', () => {
    it.each([
        {
            name: 'collapses a group and one of its leaves to the group',
            ids: ['delta', 'grp-greeks'],
            expected: ['grp-greeks']
        },
        {
            name: 'collapses a group and its ancestor group to the ancestor',
            ids: ['grp-greeks', 'grp-risk'],
            expected: ['grp-risk']
        },
        {
            name: 'collapses a group and several of its leaves to the group',
            ids: ['grp-greeks', 'delta', 'gamma'],
            expected: ['grp-greeks']
        },
        {
            name: 'keeps a group and a foreign leaf, in selection order',
            ids: ['grp-greeks', 'portfolio'],
            expected: ['grp-greeks', 'portfolio']
        },
        {
            name: 'keeps sibling groups',
            ids: ['grp-greeks', 'grp-rates'],
            expected: ['grp-greeks', 'grp-rates']
        },
        {
            name: 'keeps unrelated leaves',
            ids: ['symbol', 'portfolio'],
            expected: ['symbol', 'portfolio']
        }
    ])('$name', ({ids, expected}) => {
        expect(collapseSelection(ids.map(TRADES.row)).map(it => it.id)).toEqual(expected);
    });

    // Rows with the same columns would otherwise subsume each other into nothing.
    it('keeps the earlier of two nested groups with the same columns', () => {
        const outer = {id: 'grp-outer', isGroup: true, leafColIds: ['notes']},
            inner = {id: 'grp-inner', isGroup: true, leafColIds: ['notes']};
        expect(collapseSelection([outer, inner])).toEqual([outer]);
        expect(collapseSelection([inner, outer])).toEqual([inner]);
    });

    // BUG: colChooserDropEngine.ts:149 - only a group can subsume a row, and with equal columns
    // only an earlier one can, so a leaf listed before its single-column group survives alongside
    // it and the drag is refused as 'groupDraggedWithOthers'. Latent today: ag-Grid passes dragged
    // rows sorted by row index, which puts a group before its children.
    it.fails('collapses a single-column group and its leaf to one row in either order', () => {
        const group = {id: 'grp-notes', isGroup: true, leafColIds: ['notes']},
            leaf = {id: 'notes', isGroup: false, leafColIds: ['notes']};
        expect(collapseSelection([group, leaf])).toHaveLength(1);
        expect(collapseSelection([leaf, group])).toHaveLength(1);
    });
});

//------------------
// Test support
//------------------
interface DropCase {
    name: string;
    /** Pinned side by colId - all other columns start unpinned. */
    pins?: Record<string, HSide>;
    /** Leaf colIds under the dragged row(s). */
    moving: string[];
    /** groupId of a dragged group row - omit for a leaf drag. */
    group?: string;
    /** colId or groupId of the target row, or null for no target. */
    target: string | null;
    position?: 'above' | 'below';
    makeVisible?: boolean;
}

type Fixture = ReturnType<typeof fixture>;

/** A grid's column group tree (leaf colId to group chain, outermost first) and hidden columns. */
function fixture(chains: Record<string, string[]>, hidden: string[]) {
    const colIds = Object.keys(chains),
        hiddenIds = new Set(hidden),
        chainOf: ChainOf = colId => chains[colId] ?? [],
        isDisplayed = (colId: string) => !hiddenIds.has(colId);

    return {
        chainOf,
        isDisplayed,

        /** Column state in natural order, with the given columns pinned. */
        master(pins: Record<string, HSide> = {}): ColumnState[] {
            return colIds.map(colId => ({
                colId,
                width: 100,
                hidden: hiddenIds.has(colId),
                pinned: pins[colId]
            }));
        },

        /** A chooser row - a group row for an id with member columns, otherwise a leaf row. */
        row(id: string): DropTarget {
            const leafColIds = colIds.filter(c => chainOf(c).includes(id));
            return leafColIds.length
                ? {id, isGroup: true, leafColIds}
                : {id, isGroup: false, leafColIds: [id]};
        },

        /** Rendered colIds of a bucket, in order. */
        view(state: ColumnState[], side: HSide | null): string[] {
            return state
                .filter(it => (it.pinned ?? null) === side && !it.hidden)
                .map(it => it.colId);
        },

        /** Rendered colIds of a group across all buckets, in order. */
        groupView(state: ColumnState[], groupId: string): string[] {
            return state
                .filter(it => !it.hidden && chainOf(it.colId).includes(groupId))
                .map(it => it.colId);
        },

        dropInput(master: ColumnState[], drop: Omit<DropCase, 'name'> & {side: HSide | null}) {
            return {
                master,
                chainOf,
                isDisplayed,
                side: drop.side,
                lockColumnGroups: true,
                movingLeafColIds: drop.moving,
                dragUnitGroupId: drop.group ?? null,
                target: drop.target == null ? null : this.row(drop.target),
                position: drop.position ?? 'above',
                makeVisible: drop.makeVisible ?? false
            };
        }
    };
}

/**
 * Resolve a drop with column groups locked, checking it is allowed and keeps every group
 * contiguous - the invariant whose violation triggers ag-Grid warning #39.
 */
function resolveLockedDrop(
    fx: Fixture,
    drop: Omit<DropCase, 'name'> & {side: HSide | null}
): {master: ColumnState[]; state: ColumnState[]} {
    const master = fx.master(drop.pins),
        {allowed, state} = resolveDrop(fx.dropInput(master, drop));
    expect(allowed).toBe(true);
    expect(invariantHolds(state, fx.chainOf)).toBe(true);
    return {master, state};
}

/** A sequence of colIds as a delimited string, to assert one sequence runs within another. */
function asRun(colIds: string[]): string {
    return `|${colIds.join('|')}|`;
}
