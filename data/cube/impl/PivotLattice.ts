/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {PlainObject} from '@xh/hoist/core';

/**
 * Pure combinatorial core of the Cube pivot view: discovers the pivot path tree from a set of
 * records, then plans the lattice of `(group node, pivot path)` cells that `PivotView` materializes
 * as rows in the aggregation network.
 *
 * Deliberately free of any runtime framework dependency - plain data and integer indices only, so
 * it can be exercised directly under `npx tsx` (see `PivotLattice.spec.ts`) and reasoned about
 * without `View`'s lifecycle machinery. Callers hold the mapping from index to row object.
 *
 * Everything is expressed over indices rather than objects to keep planning allocation-light: at
 * the profiles this must support, one plan object per cell would itself be a meaningful fraction
 * of pivot-layer heap.
 */

/** Separator between path segments, and between a path key and its value field. */
export const PATH_DELIMITER = '>>';

/** A cell's children are either all cells (group or pivot axis) or all leaf rows. */
export const CHILD_KIND_CELL = 0;
export const CHILD_KIND_LEAF = 1;

/** Sentinel segment for a null / blank pivot value. Unreachable by escaping a real value. */
const EMPTY_SEGMENT = '\\e';

export interface PivotRecordLike {
    data: PlainObject;
}

/** One node of the pivot path tree; index 0 is always the synthetic root path. */
export interface PivotPathSpec {
    idx: number;
    /** Index into the query's `pivotDimensions`; -1 for the root. */
    dimIdx: number;
    /** Raw dimension value, null for an empty segment. */
    value: any;
    /** Display string - `emptyPathLabel` for an empty segment. */
    label: string;
    /** Escaped, delimiter-joined path key; '' for the root. */
    key: string;
    depth: number;
    parentIdx: number;
    childIdxs: number[];
    isEmpty: boolean;
}

export interface PivotPathDiscoveryConfig {
    /** Label for a null / blank pivot dimension value. Default '(empty)'. */
    emptyPathLabel?: string;

    /** Throw if the discovered path count exceeds this. Default 1000; null to disable. */
    maxPivotPaths?: number;

    delimiter?: string;
}

export interface PivotPathDiscoveryResult {
    /** Path tree in depth-first order, root at index 0. Parents always precede their children. */
    paths: PivotPathSpec[];
    /** Per input record, the index of its full-depth path. 0 (root) when not pivoting. */
    pathIdxOfRecord: Int32Array;
    pathParentIdx: Int32Array;
    pathDepth: Int32Array;
    /** Number of pivot dimensions. */
    maxDepth: number;
}

export interface PivotLatticeSpec {
    groupCount: number;
    /**
     * Group-axis parent of each group node; -1 for a root node.
     *
     * Parents MUST precede their children - `parentOfGroup[g] < g`, which a DFS preorder walk gives
     * for free. Enforced, because it is what lets the populated-path union and the cell build run as
     * plain descending index scans rather than needing a depth sort.
     */
    parentOfGroup: ArrayLike<number>;
    /** 1 where a group's children are leaf rows rather than further groups. */
    innermost: ArrayLike<number>;
    /** Innermost group owning each leaf. */
    leafOwnerGroup: ArrayLike<number>;
    /** Full-depth path index of each leaf. */
    leafPathIdx: ArrayLike<number>;
    pathCount: number;
    pathParentIdx: ArrayLike<number>;
    pathDepth: ArrayLike<number>;
    maxDepth: number;
}

export interface PivotLatticeResult {
    cellCount: number;
    cellGroup: Int32Array;
    cellPath: Int32Array;
    /** Group-axis parent cell - `C(parent(G), P)`; -1 if none. */
    cellParent: Int32Array;
    /**
     * Pivot-axis parent cell - `C(G, parent(P))`; -1 unless G owns leaves and P is at depth 2+.
     * At depth 1 the pivot parent would be `C(G, rootPath)`, which *is* G - already updated by its
     * own children. Keeping these routes disjoint is what rules out double counting.
     */
    cellPivotParent: Int32Array;
    cellChildKind: Uint8Array;
    /** CSR offsets into `childIdx`, length `cellCount + 1`. */
    childStart: Int32Array;
    /** Cell indices or leaf indices, per the owning cell's `cellChildKind`. */
    childIdx: Int32Array;
    /** Per leaf, the cell it feeds - `C(G, fullPath)`; -1 when not pivoting. */
    leafPivotParentCell: Int32Array;
    /** Maps `groupIdx * pathCount + pathIdx` to a cell index. */
    cellOfKey: Map<number, number>;
}

/**
 * Build the global pivot path tree - the union of paths across all records, so that columns are
 * uniform - and stamp each record with its full-depth path index.
 *
 * A null or blank pivot value forms its own path segment rather than being dropped; apps wanting
 * those records gone apply `excludeEmptyPivotValues`, which filters them out upstream of this so
 * they leave the group aggregates too.
 */
export function discoverPivotPaths(
    records: ArrayLike<PivotRecordLike>,
    pivotDimNames: string[],
    config: PivotPathDiscoveryConfig = {}
): PivotPathDiscoveryResult {
    const {emptyPathLabel = '(empty)', maxPivotPaths = 1000, delimiter = PATH_DELIMITER} = config,
        maxDepth = pivotDimNames.length;

    interface Node {
        value: any;
        label: string;
        segKey: string;
        isEmpty: boolean;
        depth: number;
        dimIdx: number;
        children: Map<string, Node>;
        emptyChild: Node;
        idx: number;
    }

    const mkNode = (value: any, isEmpty: boolean, depth: number): Node => ({
        value: isEmpty ? null : value,
        label: isEmpty ? emptyPathLabel : String(value),
        segKey: isEmpty ? EMPTY_SEGMENT : escapeSegment(String(value)),
        isEmpty,
        depth,
        dimIdx: depth - 1,
        children: new Map(),
        emptyChild: null,
        idx: -1
    });

    const root = mkNode(null, false, 0),
        recNodes: Node[] = new Array(records.length);

    for (let i = 0; i < records.length; i++) {
        const {data} = records[i];
        let node = root;
        for (let d = 0; d < maxDepth; d++) {
            const raw = data[pivotDimNames[d]],
                isEmpty = raw == null || raw === '';

            if (isEmpty) {
                node = node.emptyChild ??= mkNode(null, true, d + 1);
            } else {
                const mapKey = String(raw);
                let child = node.children.get(mapKey);
                if (!child) node.children.set(mapKey, (child = mkNode(raw, false, d + 1)));
                node = child;
            }
        }
        recNodes[i] = node;
    }

    // Enforce the cardinality guard before any cell work, naming the offending dimension.
    if (maxPivotPaths != null) {
        let level = [root],
            cumulative = 0;
        for (let d = 0; d < maxDepth; d++) {
            const next: Node[] = [];
            level.forEach(n => {
                n.children.forEach(c => next.push(c));
                if (n.emptyChild) next.push(n.emptyChild);
            });
            cumulative += next.length;
            if (cumulative > maxPivotPaths) {
                throw new Error(
                    `Pivot dimension '${pivotDimNames[d]}' produces ${cumulative} pivot paths, ` +
                        `exceeding maxPivotPaths of ${maxPivotPaths}. Pivot on a lower-cardinality ` +
                        `dimension, or raise / disable the limit.`
                );
            }
            level = next;
        }
    }

    // Assign indices depth-first in sorted order, so parents always precede their children and
    // path order is stable across rebuilds.
    const paths: PivotPathSpec[] = [];
    const assign = (node: Node, parent: PivotPathSpec) => {
        const spec: PivotPathSpec = {
            idx: paths.length,
            dimIdx: node.dimIdx,
            value: node.value,
            label: node.label,
            key: !parent
                ? ''
                : parent.depth === 0
                  ? node.segKey
                  : parent.key + delimiter + node.segKey,
            depth: node.depth,
            parentIdx: parent ? parent.idx : -1,
            childIdxs: [],
            isEmpty: node.isEmpty
        };
        node.idx = spec.idx;
        paths.push(spec);
        parent?.childIdxs.push(spec.idx);

        const kids = Array.from(node.children.values()).sort((a, b) =>
            compareValues(a.value, b.value)
        );
        if (node.emptyChild) kids.push(node.emptyChild);
        kids.forEach(k => assign(k, spec));
    };
    assign(root, null);

    const pathIdxOfRecord = new Int32Array(records.length);
    for (let i = 0; i < records.length; i++) pathIdxOfRecord[i] = recNodes[i].idx;

    const pathParentIdx = new Int32Array(paths.length),
        pathDepth = new Int32Array(paths.length);
    paths.forEach(p => {
        pathParentIdx[p.idx] = p.parentIdx;
        pathDepth[p.idx] = p.depth;
    });

    return {paths, pathIdxOfRecord, pathParentIdx, pathDepth, maxDepth};
}

/**
 * Synthetic field name a cell's value is written to on its owning group row's data. The root path
 * yields the value field's own name, so row-total columns bind to the plain field and the
 * totals-vs-cells relationship is structural rather than a naming convention.
 */
export function pivotCellFieldName(
    pathKey: string,
    valueFieldName: string,
    delimiter: string = PATH_DELIMITER
): string {
    return pathKey === '' ? valueFieldName : pathKey + delimiter + valueFieldName;
}

/**
 * Plan the cell lattice: which `(group, path)` cells are populated, what each one's children are,
 * and how updates route up the group and pivot axes.
 *
 * Every cell's children are a strict partition of its own leaf set, which is what makes every
 * existing Cube aggregator correct by construction down either axis.
 */
export function buildPivotLattice(spec: PivotLatticeSpec): PivotLatticeResult {
    const {
            groupCount,
            parentOfGroup,
            innermost,
            leafOwnerGroup,
            leafPathIdx,
            pathCount,
            pathParentIdx,
            pathDepth,
            maxDepth
        } = spec,
        leafCount = leafOwnerGroup.length;

    // A group must decompose on exactly one axis. Mixing leaves and child groups at one node -
    // reachable today only by bucketing leaves under `includeLeaves` - would give a cell two
    // update routes into the same parent and silently double count.
    const hasGroupChild = new Uint8Array(groupCount),
        hasLeafChild = new Uint8Array(groupCount);
    for (let g = 0; g < groupCount; g++) {
        const p = parentOfGroup[g];
        if (p >= g) {
            throw new Error(
                `Pivot group node ${g} has parent ${p}: parents must precede their children.`
            );
        }
        if (p >= 0) hasGroupChild[p] = 1;
    }
    for (let l = 0; l < leafCount; l++) hasLeafChild[leafOwnerGroup[l]] = 1;
    for (let g = 0; g < groupCount; g++) {
        if (hasGroupChild[g] && hasLeafChild[g]) {
            throw new Error(
                `Pivot group node ${g} has both leaf and group children, which the pivot lattice ` +
                    `cannot decompose. Bucketing within the pivot axis is not supported.`
            );
        }
        if (hasLeafChild[g] && !innermost[g]) {
            throw new Error(`Pivot group node ${g} owns leaves but is not marked innermost.`);
        }
    }

    // Populated paths per group: prefixes of each leaf's path, unioned up the group axis. Held as
    // sorted arrays, allocated only where non-empty - a Set per group dominated build time on
    // profiles with a unique-per-leaf innermost grouping, where there is one group per leaf.
    //
    // Descending index order is a valid bottom-up walk given the parents-before-children
    // precondition, which also makes an explicit depth computation and sort unnecessary.
    const populated: number[][] = new Array(groupCount);
    for (let l = 0; l < leafCount; l++) {
        const g = leafOwnerGroup[l],
            arr = populated[g] ?? (populated[g] = []);
        for (let p = leafPathIdx[l]; p > 0; p = pathParentIdx[p]) arr.push(p);
    }

    // Normalize the raw pushes up front, so every `mergeSorted` argument satisfies its precondition -
    // a group's own array is otherwise still raw when a child merges into it.
    for (let g = 0; g < groupCount; g++) {
        if (populated[g]) sortedUnique(populated[g]);
    }

    for (let g = groupCount - 1; g >= 0; g--) {
        const arr = populated[g];
        if (!arr) continue;

        const pg = parentOfGroup[g];
        if (pg >= 0) {
            populated[pg] = populated[pg] ? mergeSorted(populated[pg], arr) : arr.slice();
        }
    }

    // Cells, ordered by (group, path). Path indices are tree-ordered, so a cell always follows the
    // cell for its parent path within the same group.
    const cellGroupArr: number[] = [],
        cellPathArr: number[] = [],
        cellOfKey = new Map<number, number>();
    for (let g = 0; g < groupCount; g++) {
        const paths = populated[g];
        if (!paths) continue;
        for (const p of paths) {
            cellOfKey.set(g * pathCount + p, cellGroupArr.length);
            cellGroupArr.push(g);
            cellPathArr.push(p);
        }
    }

    const cellCount = cellGroupArr.length,
        cellGroup = Int32Array.from(cellGroupArr),
        cellPath = Int32Array.from(cellPathArr),
        cellParent = new Int32Array(cellCount).fill(-1),
        cellPivotParent = new Int32Array(cellCount).fill(-1);

    for (let c = 0; c < cellCount; c++) {
        const g = cellGroup[c],
            p = cellPath[c],
            pg = parentOfGroup[g];
        if (pg >= 0) cellParent[c] = cellOfKey.get(pg * pathCount + p) ?? -1;
        if (hasLeafChild[g] && pathDepth[p] >= 2) {
            cellPivotParent[c] = cellOfKey.get(g * pathCount + pathParentIdx[p]) ?? -1;
        }
    }

    // CSR child-group and child-path indices, plus leaves bucketed by their full-depth cell.
    const childGroups = csrFromParents(parentOfGroup, groupCount),
        childPaths = csrFromParents(pathParentIdx, pathCount),
        leavesOfKey = new Map<number, number[]>();
    for (let l = 0; l < leafCount; l++) {
        const key = leafOwnerGroup[l] * pathCount + leafPathIdx[l];
        let arr = leavesOfKey.get(key);
        if (!arr) leavesOfKey.set(key, (arr = []));
        arr.push(l);
    }

    const forEachChild = (c: number, fn: (idx: number) => void): number => {
        const g = cellGroup[c],
            p = cellPath[c];

        if (!hasLeafChild[g]) {
            for (let i = childGroups.start[g]; i < childGroups.start[g + 1]; i++) {
                const cc = cellOfKey.get(childGroups.idx[i] * pathCount + p);
                if (cc != null) fn(cc);
            }
            return CHILD_KIND_CELL;
        }

        if (pathDepth[p] < maxDepth) {
            for (let i = childPaths.start[p]; i < childPaths.start[p + 1]; i++) {
                const cc = cellOfKey.get(g * pathCount + childPaths.idx[i]);
                if (cc != null) fn(cc);
            }
            return CHILD_KIND_CELL;
        }

        leavesOfKey.get(g * pathCount + p)?.forEach(fn);
        return CHILD_KIND_LEAF;
    };

    const cellChildKind = new Uint8Array(cellCount),
        childStart = new Int32Array(cellCount + 1);
    for (let c = 0; c < cellCount; c++) {
        let n = 0;
        cellChildKind[c] = forEachChild(c, () => n++);
        childStart[c + 1] = childStart[c] + n;
    }

    const childIdx = new Int32Array(childStart[cellCount]);
    for (let c = 0; c < cellCount; c++) {
        let at = childStart[c];
        forEachChild(c, i => (childIdx[at++] = i));
    }

    const leafPivotParentCell = new Int32Array(leafCount);
    for (let l = 0; l < leafCount; l++) {
        leafPivotParentCell[l] =
            cellOfKey.get(leafOwnerGroup[l] * pathCount + leafPathIdx[l]) ?? -1;
    }

    return {
        cellCount,
        cellGroup,
        cellPath,
        cellParent,
        cellPivotParent,
        cellChildKind,
        childStart,
        childIdx,
        leafPivotParentCell,
        cellOfKey
    };
}

//------------------------
// Implementation
//------------------------
/** Injective, so distinct values can never produce the same path key. Nothing ever parses these. */
function escapeSegment(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/>/g, '\\>');
}

function sortedUnique(values: number[]): number[] {
    values.sort((a, b) => a - b);
    let n = 0;
    for (let i = 0; i < values.length; i++) {
        if (i === 0 || values[i] !== values[i - 1]) values[n++] = values[i];
    }
    values.length = n;
    return values;
}

/** Union of two ascending, duplicate-free arrays. */
function mergeSorted(a: number[], b: number[]): number[] {
    const ret: number[] = [];
    let i = 0,
        j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            ret.push(a[i++]);
            j++;
        } else if (a[i] < b[j]) {
            ret.push(a[i++]);
        } else {
            ret.push(b[j++]);
        }
    }
    while (i < a.length) ret.push(a[i++]);
    while (j < b.length) ret.push(b[j++]);
    return ret;
}

function csrFromParents(
    parentOf: ArrayLike<number>,
    count: number
): {start: Int32Array; idx: Int32Array} {
    const start = new Int32Array(count + 1);
    for (let i = 0; i < count; i++) {
        const p = parentOf[i];
        if (p >= 0) start[p + 1]++;
    }
    for (let i = 0; i < count; i++) start[i + 1] += start[i];

    const fill = start.slice(0, count),
        idx = new Int32Array(start[count]);
    for (let i = 0; i < count; i++) {
        const p = parentOf[i];
        if (p >= 0) idx[fill[p]++] = i;
    }
    return {start, idx};
}

/** Deterministic ascending order, independent of locale. */
function compareValues(a: any, b: any): number {
    if (a === b) return 0;
    const ta = typeOrder(a),
        tb = typeOrder(b);
    if (ta !== tb) return ta - tb;

    if (ta === 0) return (a as number) - (b as number);
    if (ta === 1) return (a ? 1 : 0) - (b ? 1 : 0);
    if (ta === 2) return (a as Date).getTime() - (b as Date).getTime();

    const sa = String(a),
        sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function typeOrder(v: any): number {
    if (typeof v === 'number') return 0;
    if (typeof v === 'boolean') return 1;
    if (v instanceof Date) return 2;
    return 3;
}
