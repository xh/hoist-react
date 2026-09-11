/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {PlainObject} from '@xh/hoist/core';
import type {PivotLatticeSpec} from './PivotLattice';

/**
 * Brute-force reference implementation of the pivot lattice, used only to assert the behavior of
 * {@link buildPivotLattice}. Deliberately naive - O(groups x paths x leaves) - so that its
 * correctness is self-evident by inspection. Never used in production code paths.
 *
 * Kept out of `data/index.ts`: import via deep path from test drivers and the Toolbox harness.
 */

export interface ReferenceGroupTree {
    groupCount: number;
    /** Group-axis parent of each group; -1 for the synthetic root at index 0. */
    parentOfGroup: Int32Array;
    /** 1 where a group's children are leaf rows rather than further groups. */
    innermost: Uint8Array;
    /** Innermost group owning each leaf. */
    leafOwnerGroup: Int32Array;
    /** Human-readable group path, for failure messages. */
    groupKey: string[];
}

/**
 * Group records hierarchically the way {@link View.groupAndInsertRecords} does - string-keyed
 * `groupBy` per dimension, in first-appearance order - always rooted at a synthetic group 0.
 * Guarantees parents are assigned lower indices than their children.
 */
export function buildReferenceGroupTree(
    records: ArrayLike<{data: PlainObject}>,
    groupDimNames: string[]
): ReferenceGroupTree {
    const parentOf: number[] = [-1],
        innermost: number[] = [0],
        groupKey: string[] = ['root'],
        leafOwner: number[] = new Array(records.length).fill(-1);

    const recurse = (recIdxs: number[], dimIdx: number, groupIdx: number) => {
        if (dimIdx >= groupDimNames.length) {
            innermost[groupIdx] = 1;
            recIdxs.forEach(i => (leafOwner[i] = groupIdx));
            return;
        }

        const dimName = groupDimNames[dimIdx],
            buckets = new Map<string, number[]>();

        recIdxs.forEach(i => {
            const k = String(records[i].data[dimName]);
            let bucket = buckets.get(k);
            if (!bucket) buckets.set(k, (bucket = []));
            bucket.push(i);
        });

        buckets.forEach((idxs, k) => {
            const childIdx = parentOf.length;
            parentOf.push(groupIdx);
            innermost.push(0);
            groupKey.push(`${groupKey[groupIdx]}/${dimName}=[${k}]`);
            recurse(idxs, dimIdx + 1, childIdx);
        });
    };

    const all: number[] = [];
    for (let i = 0; i < records.length; i++) all.push(i);
    recurse(all, 0, 0);

    return {
        groupCount: parentOf.length,
        parentOfGroup: Int32Array.from(parentOf),
        innermost: Uint8Array.from(innermost),
        leafOwnerGroup: Int32Array.from(leafOwner),
        groupKey
    };
}

/**
 * The leaf set of every `(group, path)` cell, computed directly from first principles: a leaf
 * belongs to cell `(g, p)` iff its owning group is `g` or a descendant of `g`, and `p` is a prefix
 * of the leaf's own path. Keyed by `groupIdx * pathCount + pathIdx`, root path (0) included.
 *
 * This is the definition the lattice must reproduce - it encodes both which cells are populated
 * and what each one must aggregate.
 */
export function referenceLeafSets(spec: PivotLatticeSpec): Map<number, number[]> {
    const {groupCount, pathCount, parentOfGroup, leafOwnerGroup, leafPathIdx, pathParentIdx} = spec,
        leafCount = leafOwnerGroup.length,
        ret = new Map<number, number[]>();

    for (let g = 0; g < groupCount; g++) {
        for (let leaf = 0; leaf < leafCount; leaf++) {
            if (!isAncestorOrSelf(g, leafOwnerGroup[leaf], parentOfGroup)) continue;
            for (let p = leafPathIdx[leaf]; p >= 0; p = pathParentIdx[p]) {
                const key = g * pathCount + p;
                let arr = ret.get(key);
                if (!arr) ret.set(key, (arr = []));
                arr.push(leaf);
            }
        }
    }

    ret.forEach(arr => arr.sort((a, b) => a - b));
    return ret;
}

/** All groups from `g` up to the root, inclusive. */
export function groupAncestry(g: number, parentOfGroup: ArrayLike<number>): number[] {
    const ret: number[] = [];
    for (let cur = g; cur >= 0; cur = parentOfGroup[cur]) ret.push(cur);
    return ret;
}

function isAncestorOrSelf(anc: number, g: number, parentOfGroup: ArrayLike<number>): boolean {
    for (let cur = g; cur >= 0; cur = parentOfGroup[cur]) {
        if (cur === anc) return true;
    }
    return false;
}
