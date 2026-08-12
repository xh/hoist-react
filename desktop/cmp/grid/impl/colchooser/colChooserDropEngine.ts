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
 * Pure resolution engine for column-chooser drag-and-drop - plain `ColumnState[]` master data plus a
 * `chainOf` group lookup, with no ag-Grid, MobX, or model deps. Rules and worked cases:
 * `docs/planning/locked-group-dnd-spec.md`.
 *
 * Keep every `@xh/hoist` import here type-only - a runtime import breaks bare-`tsx` execution of
 * `colChooserDropEngine.spec.ts`.
 */

/** Maps a leaf colId to its group chain as groupIds, outermost (top-level) to innermost. */
export type ChainOf = (colId: string) => string[];

/**
 * Why a drag is refused, as an explanatory hint. All reasons are target-independent selection
 * refusals - a locked-group split is clamped rather than refused (§5B), and benign rejections
 * (hovering the dragged row, a no-op reorder) carry no reason.
 */
export type DropRejectReason = 'notMovable' | 'groupDraggedWithOthers' | 'multiGroupSelection';

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
     * True if a leaf colId is currently rendered in its bucket - false when routed to the Column
     * Library or excluded by an active Store filter.
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
 * Resolve a proposed drop - the single source of truth for both the drag preview and the commit.
 * Operates on the one master array; buckets are views of it filtered by pinned side.
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
        makeVisible = false
    } = input;
    const L = new Set(movingLeafColIds);

    if (!master.some(cs => L.has(cs.colId))) return {allowed: false, state: null};

    // No in-bucket target (empty bucket, or an append below the last row): pin in place, leaving
    // master order untouched (§6).
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
        return {allowed: true, state: spliceMove(input, target, L, L, null)};
    }

    const dragLeaf = movingLeafColIds[0];

    // Bounding group (§5B): innermost ancestor still rendered in this bucket. A drop resolving outside
    // its run is clamped to the near edge, never refused. Null = unconstrained.
    const boundGroup = renderedAncestor(
        master,
        dragLeaf,
        dragUnitGroupId,
        pinned,
        isDisplayed,
        L,
        chainOf
    );

    // Move set (spec §7): start from the dragged leaves alone, escalate outward through their
    // ancestor groups, and stop at the first block whose relocation keeps every group contiguous.
    const chain = chainOf(dragLeaf),
        candidates: Set<string>[] = [new Set(L)];
    for (let d = chain.length - 1; d >= 0; d--) {
        candidates.push(new Set(groupLeafIds(master, chain[d], chainOf)));
    }
    for (const moveSet of candidates) {
        const state = spliceMove(input, target, moveSet, L, boundGroup);
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
 * Drop rows subsumed by a selected group, so a group dragged alongside its own descendants collapses
 * to a coherent single-group drag. Foreign rows are retained, and remain multiple units for
 * {@link isValidDragSelection} to reject. Input order is preserved.
 */
export function collapseSelection<T extends SelectionUnit>(rows: T[]): T[] {
    return rows.filter(
        (r, i) =>
            !rows.some((g, j) => {
                if (j === i || !g.isGroup) return false;
                const gLeaves = new Set(g.leafColIds);
                if (!r.leafColIds.every(id => gLeaves.has(id))) return false;
                // Equal leaf sets (e.g. a single-column group and its child): keep the earlier row,
                // else the two subsume each other into nothing.
                return g.leafColIds.length === r.leafColIds.length ? j < i : true;
            })
    );
}

/** A single dragged row, for {@link isValidDragSelection}. */
export interface DragSelectionRow {
    /** True for a column-group row, always dragged as a single unit. */
    isGroup: boolean;
    /** Whether this row may be dragged: a leaf's `movable`, or a group with any movable descendant. */
    movable: boolean;
    /** The row's immediate parent groupId, or null at the root. Only consulted for leaf rows. */
    parentGroupId: string | null;
}

/**
 * Gate a drag by its selected rows alone, so an incoherent multi-select is refused up front rather
 * than silently moving only part of it. Movability is enforced only on the rows the user grabbed: a
 * `movable:false` column rides along when a parent group moves, per ag-Grid's `suppressMovable`.
 */
export function isValidDragSelection(rows: DragSelectionRow[], lockColumnGroups: boolean): boolean {
    return !!rows.length && dragSelectionRejectReason(rows, lockColumnGroups) == null;
}

/**
 * The reason {@link isValidDragSelection} would refuse a selection, or null if valid (or empty - no
 * drag to explain). Companion to the boolean gate, so the UI can explain *why*.
 */
export function dragSelectionRejectReason(
    rows: DragSelectionRow[],
    lockColumnGroups: boolean
): DropRejectReason | null {
    if (!rows.length) return null;
    if (rows.some(r => !r.movable)) return 'notMovable';

    const groupCount = rows.filter(r => r.isGroup).length;
    if (groupCount > 0) return rows.length === 1 ? null : 'groupDraggedWithOthers';

    if (lockColumnGroups) {
        const parents = new Set(rows.map(r => r.parentGroupId ?? null));
        if (parents.size > 1) return 'multiGroupSelection';
    }
    return null;
}

/**
 * True if committing `candidate` leaves every bucket's rendered sequence unchanged (§5A Rule B).
 * Compare per bucket, never on interleaved master: a pinned column reordering relative to an unpinned
 * one is invisible to the user, and treating it as a change churns master for nothing (C-N1/C-GR).
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
 * ag-grid's `marryChildren` invariant: every group, at every nesting level, occupies a contiguous
 * index range in flat master (hidden columns included, pinning ignored) - mirroring ag-grid's own
 * `doesMovePassMarryChildren`. A state that fails it triggers ag-grid warning #39 on apply.
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
 * Master state relocating `moveSet` to the drop point, re-pinning `pinLeaves` to this bucket (and
 * unhiding them for a library drop). Locked drops resolve in the target bucket's rendered order
 * (§5A Rule A) and clamp to `boundGroup`'s run; unlocked drops splice at the raw target index.
 */
function spliceMove(
    input: ResolveDropInput,
    target: DropTarget,
    moveSet: Set<string>,
    pinLeaves: Set<string>,
    boundGroup: string | null
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
        dragChain = new Set(chainOf([...pinLeaves][0]));

    let at = lockColumnGroups
        ? viewInsertionIndex(remaining, target, position, pinned, isDisplayed, dragChain, chainOf)
        : baseInsertionIndex(remaining, target, position);

    // Clamp keeps the block inside its parent, rather than escalating to relocate the parent (§5B).
    if (lockColumnGroups && boundGroup) {
        const lo = remaining.findIndex(cs => chainOf(cs.colId).includes(boundGroup));
        if (lo >= 0) {
            const hi = findLastIndex(remaining, cs => chainOf(cs.colId).includes(boundGroup)) + 1;
            at = Math.min(Math.max(at, lo), hi);
        }
    }

    remaining.splice(at, 0, ...moving);
    return remaining;
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
 * Chain depth the dragged unit itself occupies ({@link renderedAncestor} scans down from `depth - 1`).
 * For a group this INCLUDES its own level, so a spanning group is bound to its own run (strict rejoin)
 * while a full/fresh group resolves to a higher ancestor (§5A/2b).
 */
function unitDepth(dragLeaf: string, dragUnitGroupId: string | null, chainOf: ChainOf): number {
    const chain = chainOf(dragLeaf);
    return dragUnitGroupId == null ? chain.length : chain.indexOf(dragUnitGroupId) + 1;
}

/**
 * Innermost ancestor (from the unit's own level outward) with a non-dragged member rendered in the
 * target bucket - the group whose run bounds the drop. Null if none.
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

/** Insertion gap in `remaining` for a drop target/position, by raw master index (unlocked drops). */
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
 * Insertion gap in `remaining` resolved in the target bucket's rendered-leaf order (§5A Rule A) rather
 * than raw master indices. `dragChain` is the groupIds the dragged unit belongs to: it is never
 * snapped out of its own groups, and never splits a group it is foreign to (§5B).
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
            // Foreign group collapses to one drop unit, flipping at its vertical midpoint (§5B):
            // `i` = hovered member index among `members`, `below` adds a half-row. i < 0 for a
            // group/edge target not among the members.
            const members = bucketIds.filter(id => chainOf(id).includes(pc[k])),
                i = members.indexOf(target.id),
                below = position === 'below' ? 1 : 0,
                before = i < 0 ? below === 0 : 2 * i + below < members.length;
            return before ? runStart(pc[k]) : runEnd(pc[k]);
        }
    }
    if (next != null) {
        for (let k = s; k < nc.length; k++) if (!dragChain.has(nc[k])) return runStart(nc[k]);
        // Anchor before `next` only when the unit joins next's group, or there is no prev to fall back
        // to: next's raw master index can sit across a run of hidden or other-bucket columns, which
        // would split the unit's own group (C-HIDDEN-GAP).
        if (prev == null || nc.slice(s).some(g => dragChain.has(g))) return idxOf(next);
    }
    if (prev != null) {
        for (let k = s; k < pc.length; k++) if (!dragChain.has(pc[k])) return runEnd(pc[k]);
        return idxOf(prev) + 1;
    }
    return remaining.length; // no rendered rows (defensive; a null target is handled upstream)
}
