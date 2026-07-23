/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ColumnState} from '@xh/hoist/cmp/grid';
import type {HSide} from '@xh/hoist/core';
import type {RowDropTargetPosition} from '@xh/hoist/kit/ag-grid';
import {findLastIndex} from 'lodash';

/**
 * Pure resolution engine for column-chooser drag-and-drop. All logic operates on plain
 * `ColumnState[]` master data plus a `chainOf` group-lookup - no ag-Grid, MobX, or model deps - so it
 * is unit-testable headless (see `colChooserDropEngine.spec.ts`) and free of the ag-Grid glue that
 * lives in {@link ColumnChooserBucketModel}. See `docs/planning/locked-group-dnd-spec.md` for the model (esp. §5A).
 *
 * The `@xh/hoist` imports here are **type-only** (erased at runtime), so this module carries no
 * runtime dependency on the framework and runs under bare `tsx`.
 */

/** Maps a leaf colId to its group chain as groupIds, outermost (top-level) to innermost. */
export type ChainOf = (colId: string) => string[];

/** The drop target: a leaf row (`isGroup:false`, `leafColIds:[self]`) or a group row. */
export interface DropTarget {
    id: string;
    isGroup: boolean;
    leafColIds: string[];
}

export interface ResolveDropInput {
    /** The full master column state (all buckets), in ag-Grid's applied order. */
    master: ColumnState[];
    chainOf: ChainOf;
    /** The target (drop) bucket. */
    side: HSide | null;
    /**
     * True if a leaf colId is currently rendered in its bucket. Unifies the two ways a column can be
     * absent from a bucket's rendered rows: routed to the Column Library (the old `showHidden` case)
     * or excluded by an active Store filter. Derived from each bucket store's `records`.
     */
    isDisplayed: (colId: string) => boolean;
    lockColumnGroups: boolean;
    /** Leaf colIds under the dragged row(s). */
    movingLeafColIds: string[];
    /** groupId of an explicitly dragged group row; null for a leaf drag. */
    dragUnitGroupId: string | null;
    /** The row the drop is over, or null for a no-target drop (empty bucket / append). */
    target: DropTarget | null;
    position: RowDropTargetPosition;
    /** Unhide the dragged leaves (a drop from the Column Library). */
    makeVisible?: boolean;
}

/**
 * Resolve a proposed drop into `{allowed, state}` - the single source of truth for both the drag
 * preview and the commit. Operates on the single master array; buckets are views of it filtered by
 * pinned side. See `docs/planning/locked-group-dnd-spec.md` for the full model.
 */
export function resolveDrop(input: ResolveDropInput): {
    allowed: boolean;
    state: ColumnState[] | null;
} {
    const {
        master,
        chainOf,
        side: pinned,
        isDisplayed,
        lockColumnGroups,
        movingLeafColIds,
        dragUnitGroupId,
        target,
        position,
        makeVisible = false
    } = input;
    const L = new Set(movingLeafColIds);

    if (!master.some(cs => L.has(cs.colId))) return {allowed: false, state: null};

    // No in-bucket drop target (empty bucket, or an append with nothing under the cursor): pin in
    // place per spec §6 - set the pin flag on the dragged leaves without moving them in master.
    // Pinning is orthogonal to order (§1), so the group simply spans the boundary; the order is
    // unchanged, so this can never split a group and is always allowed.
    if (!target) {
        return {
            allowed: true,
            state: master.map(cs =>
                L.has(cs.colId) ? {...cs, pinned, ...(makeVisible ? {hidden: false} : {})} : {...cs}
            )
        };
    }

    // Unlocked: no group-contiguity constraint - re-pin the dragged leaves and splice at the drop.
    if (!lockColumnGroups) {
        return {allowed: true, state: spliceMove(input, target, L, L)};
    }

    const dragLeaf = movingLeafColIds[0];

    // Validity (spec §5): the drop must fall within the bounding group's run, else it is rejected.
    // The bound is the innermost ancestor (including the dragged group's own level - §5A/2b) that
    // still has a non-dragged member RENDERED in this bucket. Intra- and cross-bucket share this
    // rule (this bucket is the target either way); counting only rendered members means a hidden
    // same-bucket sibling never makes a full visible group's drag strict. Null bound → never
    // rejected (relaxed - a fresh group relocates freely; a leaf's group auto-moves via §7).
    const boundGroup = renderedAncestor(
        master,
        dragLeaf,
        dragUnitGroupId,
        pinned,
        isDisplayed,
        L,
        chainOf
    );
    if (boundGroup && !dropWithinGroup(master, chainOf, boundGroup, L, target, position)) {
        return {allowed: false, state: null};
    }

    // Move set (spec §7): start from the dragged leaves alone, escalate outward through their
    // ancestor groups, and stop at the first block whose relocation keeps every group contiguous.
    const chain = chainOf(dragLeaf),
        candidates: Set<string>[] = [new Set(L)];
    for (let d = chain.length - 1; d >= 0; d--) {
        candidates.push(new Set(groupLeafIds(master, chain[d], chainOf)));
    }
    for (const moveSet of candidates) {
        const state = spliceMove(input, target, moveSet, L);
        if (invariantHolds(state, chainOf)) return {allowed: true, state};
    }
    return {allowed: false, state: null}; // unreachable: the root candidate always satisfies
}

/** A dragged row identified by its leaf membership, for {@link collapseSelection}. */
export interface SelectionUnit {
    id: string;
    isGroup: boolean;
    /** The leaf colIds this row represents ([self] for a leaf, all members for a group). */
    leafColIds: string[];
}

/**
 * Drop rows subsumed by a selected group - the redundant part of a multi-select where a group is
 * dragged alongside its own descendants (its leaves, a nested subgroup, or its parent group).
 * Selecting a group already moves all its children, so a descendant adds nothing; collapsing to the
 * enclosing unit makes such a selection a coherent single-group drag rather than an incoherent mix.
 * A foreign row (not contained in any selected group) is retained, so a group + an unrelated
 * column/sibling-group still reads as multiple units (and is rejected by {@link isValidDragSelection}
 * when groups are locked). Input order is preserved.
 */
export function collapseSelection<T extends SelectionUnit>(rows: T[]): T[] {
    return rows.filter(
        (r, i) =>
            !rows.some((g, j) => {
                if (j === i || !g.isGroup) return false;
                const gLeaves = new Set(g.leafColIds);
                if (!r.leafColIds.every(id => gLeaves.has(id))) return false;
                // Equal leaf sets (degenerate - e.g. a single-column group and its child): keep the
                // earlier row so the two never subsume each other into nothing.
                return g.leafColIds.length === r.leafColIds.length ? j < i : true;
            })
    );
}

/** A single dragged row, for {@link isValidDragSelection}. */
export interface DragSelectionRow {
    /** True for a column-group row (dragged as a unit); false for a leaf column. */
    isGroup: boolean;
    /** Whether this row may be dragged: a leaf's `movable`, or a group with any movable descendant. */
    movable: boolean;
    /** The row's immediate parent groupId, or null at the root. Only consulted for leaf rows. */
    parentGroupId: string | null;
}

/**
 * Gate a drag by its selected rows alone (target-independent), so an incoherent multi-select is
 * refused up front - the drag shows `notAllowed` everywhere rather than silently moving only part of
 * the selection. A `movable:false` column still can't be dragged directly, but rides along freely
 * when a parent group moves (matching ag-Grid's `suppressMovable`), so movability is enforced only on
 * the rows the user grabbed, never on a group's passenger children.
 *
 * Rejects when:
 * - the selection is empty, or any selected row is not movable;
 * - a group row is mixed with any other row (a group is always dragged as a lone unit);
 * - groups are locked and the selected leaves don't all share one immediate parent (columns from
 *   different groups can't move together without splitting a group).
 */
export function isValidDragSelection(rows: DragSelectionRow[], lockColumnGroups: boolean): boolean {
    if (!rows.length || rows.some(r => !r.movable)) return false;

    const groupCount = rows.filter(r => r.isGroup).length;
    if (groupCount > 0) return rows.length === 1;

    if (lockColumnGroups) {
        const parents = new Set(rows.map(r => r.parentGroupId ?? null));
        if (parents.size > 1) return false;
    }
    return true;
}

/**
 * True if committing `candidate` would leave the chooser visually unchanged (spec §5A Rule B): the
 * rendered column sequence of every bucket - left, unpinned, right - is identical, each compared
 * independently. Non-displayed columns (routed to the library or filtered out) are excluded via
 * `isDisplayed`. Comparing per bucket (not the interleaved master) is essential: a pinned column
 * reordering relative to an unpinned one in master is invisible - separate rails - so it counts as a
 * no-op and never commits a churn (see C-N1/C-GR).
 */
export function isNoOpDrop(
    candidate: ColumnState[],
    current: ColumnState[],
    isDisplayed: (colId: string) => boolean
): boolean {
    const view = (st: ColumnState[], side: HSide | null) =>
        st
            .filter(cs => (cs.pinned ?? null) === side && isDisplayed(cs.colId))
            .map(cs => cs.colId)
            .join('|');
    return ([null, 'left', 'right'] as (HSide | null)[]).every(
        side => view(candidate, side) === view(current, side)
    );
}

/**
 * The ag-grid `marryChildren` invariant: every group, at every nesting level, occupies a contiguous
 * index range in the flat master array (hidden columns included, pinning ignored). This is exactly
 * ag-grid's own `doesMovePassMarryChildren` (index spread within the group's leaf count); a state
 * that fails it triggers warning #39 on apply. Exported so tests can assert #39-freedom structurally.
 */
export function invariantHolds(state: ColumnState[], chainOf: ChainOf): boolean {
    const first = new Map<string, number>(),
        last = new Map<string, number>(),
        count = new Map<string, number>();
    state.forEach((cs, i) => {
        for (const g of chainOf(cs.colId)) {
            if (!first.has(g)) first.set(g, i);
            last.set(g, i);
            count.set(g, (count.get(g) ?? 0) + 1);
        }
    });
    for (const [g, c] of count) {
        if (last.get(g) - first.get(g) > c - 1) return false;
    }
    return true;
}

//------------------
// Internal helpers
//------------------

/**
 * Produce the master state that relocates `moveSet` to the drop point, re-pinning the dragged leaves
 * `pinLeaves` to this bucket (and unhiding them for a library drop). The insertion index is resolved
 * in the target bucket's rendered order when locked (§5A Rule A), or at the raw target when unlocked.
 */
function spliceMove(
    input: ResolveDropInput,
    target: DropTarget,
    moveSet: Set<string>,
    pinLeaves: Set<string>
): ColumnState[] {
    const {
            master,
            chainOf,
            side: pinned,
            isDisplayed,
            lockColumnGroups,
            position,
            makeVisible = false
        } = input,
        moving = master
            .filter(cs => moveSet.has(cs.colId))
            .map(cs =>
                pinLeaves.has(cs.colId)
                    ? {...cs, pinned, ...(makeVisible ? {hidden: false} : {})}
                    : {...cs}
            ),
        remaining = master.filter(cs => !moveSet.has(cs.colId)),
        dragChain = new Set(chainOf([...pinLeaves][0])),
        // Locked: resolve the landing in the target bucket's rendered order (§5A Rule A).
        // Unlocked: no contiguity constraint, so splice at the raw target index (splits allowed).
        at = lockColumnGroups
            ? viewInsertionIndex(
                  remaining,
                  target,
                  position,
                  pinned,
                  isDisplayed,
                  dragChain,
                  chainOf
              )
            : baseInsertionIndex(remaining, target, position);

    remaining.splice(at, 0, ...moving);
    return remaining;
}

/**
 * True if the drop target/position lands within the given bounding group's run - i.e. it is a legal
 * reorder among that group's children rather than one that would relocate the group.
 */
function dropWithinGroup(
    master: ColumnState[],
    chainOf: ChainOf,
    groupId: string,
    L: Set<string>,
    target: DropTarget,
    position: RowDropTargetPosition
): boolean {
    const remaining = master.filter(cs => !L.has(cs.colId)),
        runIdxs = remaining
            .map((cs, i) => (chainOf(cs.colId).includes(groupId) ? i : -1))
            .filter(i => i >= 0);
    if (!runIdxs.length) return false;
    const idx = baseInsertionIndex(remaining, target, position),
        lo = Math.min(...runIdxs),
        hi = Math.max(...runIdxs) + 1;
    return idx >= lo && idx <= hi;
}

/** Leaf colIds (in master order) whose chain includes `groupId`. */
function groupLeafIds(state: ColumnState[], groupId: string, chainOf: ChainOf): string[] {
    return state.filter(cs => chainOf(cs.colId).includes(groupId)).map(cs => cs.colId);
}

/** True if `groupId` has a displayed member in the given bucket (respecting filter/routing), excluding L. */
function groupRenderedInBucket(
    state: ColumnState[],
    groupId: string,
    side: HSide | null,
    isDisplayed: (colId: string) => boolean,
    L: Set<string>,
    chainOf: ChainOf
): boolean {
    return state.some(
        cs =>
            !L.has(cs.colId) &&
            (cs.pinned ?? null) === side &&
            isDisplayed(cs.colId) &&
            chainOf(cs.colId).includes(groupId)
    );
}

/**
 * Depth at which to start the ancestor search (the number of chain levels the dragged unit itself
 * occupies, so {@link renderedAncestor} scans from `depth - 1` down). For a leaf, that's the whole
 * chain. For a group, it INCLUDES the group's own level: a spanning group whose other members are
 * rendered in the target bucket must be constrained to its own run - dragging its row then behaves
 * like dragging its leaves (strict rejoin), not relaxed-moving the whole group. A full/fresh group
 * (no other rendered member) still resolves to a higher ancestor / relaxed.
 */
function unitDepth(dragLeaf: string, dragUnitGroupId: string | null, chainOf: ChainOf): number {
    const chain = chainOf(dragLeaf);
    return dragUnitGroupId == null ? chain.length : chain.indexOf(dragUnitGroupId) + 1;
}

/**
 * Innermost ancestor (from the unit's own level outward) with a non-dragged member RENDERED in the
 * target bucket - the group whose run bounds the drop (outside which it is disallowed). Null if none.
 */
function renderedAncestor(
    state: ColumnState[],
    dragLeaf: string,
    dragUnitGroupId: string | null,
    side: HSide | null,
    isDisplayed: (colId: string) => boolean,
    L: Set<string>,
    chainOf: ChainOf
): string | null {
    const chain = chainOf(dragLeaf);
    for (let d = unitDepth(dragLeaf, dragUnitGroupId, chainOf) - 1; d >= 0; d--) {
        if (groupRenderedInBucket(state, chain[d], side, isDisplayed, L, chainOf)) return chain[d];
    }
    return null;
}

/**
 * Base insertion index (a gap in the moving-excluded array) for a drop target/position. A drop with
 * no target is a pin-in-place handled by {@link resolveDrop} (spec §6), so a target is always present
 * here - we never partition the master array by pinned side (§1).
 */
function baseInsertionIndex(
    remaining: ColumnState[],
    target: DropTarget,
    position: RowDropTargetPosition
): number {
    if (target.isGroup) {
        const ids = new Set(target.leafColIds),
            firstIdx = remaining.findIndex(cs => ids.has(cs.colId)),
            lastIdx = findLastIndex(remaining, cs => ids.has(cs.colId));
        return firstIdx === -1 ? remaining.length : position === 'above' ? firstIdx : lastIdx + 1;
    }
    const targetIdx = remaining.findIndex(cs => cs.colId === target.id);
    return targetIdx === -1 ? remaining.length : position === 'above' ? targetIdx : targetIdx + 1;
}

/**
 * Master index (into `remaining`, the moving-excluded array) to splice the dragged block, resolving
 * the drop in the target bucket's rendered-leaf order (spec §5A Rule A) rather than raw master
 * indices. `dragChain` is the set of groupIds the dragged unit belongs to: its block is never snapped
 * out of its own groups (it joins them), and any group it is foreign to is never split.
 *
 * Maps `(target, position)` to the gap between two rendered bucket leaves `prev`/`next`, then:
 * - a shared group of `prev`/`next` the unit is foreign to → snap to that group's near edge, chosen
 *   by which side of the gap holds more of its rendered members (the single-midpoint view flip);
 * - else anchor before `next` (or after `prev` at a bucket edge), pushed out of the outermost group
 *   the unit is foreign to below the shared level - so a foreign group is never split, and when the
 *   unit belongs all the way down it lands right beside the neighbor, joining its own group.
 */
function viewInsertionIndex(
    remaining: ColumnState[],
    target: DropTarget,
    position: RowDropTargetPosition,
    side: HSide | null,
    isDisplayed: (colId: string) => boolean,
    dragChain: Set<string>,
    chainOf: ChainOf
): number {
    const isRendered = (cs: ColumnState) => (cs.pinned ?? null) === side && isDisplayed(cs.colId),
        runStart = (g: string) => remaining.findIndex(cs => chainOf(cs.colId).includes(g)),
        runEnd = (g: string) => findLastIndex(remaining, cs => chainOf(cs.colId).includes(g)) + 1,
        idxOf = (colId: string) => remaining.findIndex(cs => cs.colId === colId);

    const bucketIds = remaining.filter(isRendered).map(cs => cs.colId);

    // `gp` = number of rendered bucket leaves before the gap.
    let gp: number;
    if (target.isGroup) {
        const ids = new Set(target.leafColIds),
            first = bucketIds.findIndex(id => ids.has(id)),
            last = findLastIndex(bucketIds, id => ids.has(id));
        gp = first === -1 ? bucketIds.length : position === 'below' ? last + 1 : first;
    } else {
        const ti = bucketIds.indexOf(target.id);
        gp = ti === -1 ? bucketIds.length : position === 'below' ? ti + 1 : ti;
    }
    const prev = gp > 0 ? bucketIds[gp - 1] : null,
        next = gp < bucketIds.length ? bucketIds[gp] : null,
        pc = prev ? chainOf(prev) : [],
        nc = next ? chainOf(next) : [];

    let s = 0;
    while (s < pc.length && s < nc.length && pc[s] === nc[s]) s++;

    for (let k = 0; k < s; k++) {
        if (!dragChain.has(pc[k])) {
            const before = bucketIds.slice(0, gp).filter(id => chainOf(id).includes(pc[k])).length,
                after = bucketIds.slice(gp).filter(id => chainOf(id).includes(pc[k])).length;
            return before <= after ? runStart(pc[k]) : runEnd(pc[k]);
        }
    }
    if (next != null) {
        for (let k = s; k < nc.length; k++) if (!dragChain.has(nc[k])) return runStart(nc[k]);
        return idxOf(next);
    }
    if (prev != null) {
        for (let k = s; k < pc.length; k++) if (!dragChain.has(pc[k])) return runEnd(pc[k]);
        return idxOf(prev) + 1;
    }
    return remaining.length; // no rendered rows (defensive; a null target is handled upstream)
}
