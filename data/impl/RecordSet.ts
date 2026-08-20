/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import equal from 'fast-deep-equal';
import {logWarn, throwIf} from '@xh/hoist/utils/js';
import {clamp, isEmpty, isNil, maxBy} from 'lodash';
import {StoreRecord, StoreRecordId} from '../StoreRecord';
import {Store} from '../Store';
import {Filter} from '../filter/Filter';

type StoreRecordMap = Map<StoreRecordId, StoreRecord>;
type ChildRecordMap = Map<StoreRecordId, StoreRecord[]>;

/** Patch-layer entry marking a base record as removed. */
const TOMBSTONE = {} as StoreRecord;
type PatchMap = Map<StoreRecordId, StoreRecord>;

// Source of `RecordSet.ordinal` values - global uniqueness is all that matters.
let ordinalSeq = 0;

/**
 * Changes deriving one RecordSet from another, as computed by {@link RecordSet.diffFrom}.
 * Unlike a transaction used to *specify* changes, `remove` here holds the full set of removed
 * records (as they exist in the diffed-from instance), including cascaded descendants -
 * consumers apply it verbatim.
 * @internal
 */
export interface RecordSetDelta {
    update: StoreRecord[];
    add: StoreRecord[];
    remove: StoreRecord[];

    /**
     * Names of every field whose value changed in `update` records, when known - null when
     * unknown. Only populated when the delta spans a single value-only transaction that supplied
     * {@link StoreTransaction.changedFields} - carries that producer's assertion that updates
     * changed record values only (no structural/parent changes) and touched no field outside
     * the set. Lets consumers (e.g. Grid) prove a change cannot affect sort order.
     */
    changedFields?: Set<string>;
}

// Default cap on patch size as a fraction of base - 0 disables the patch layer entirely, with
// every change flattening into a fresh base. Overridable via
// `StoreConfig.experimental.maxPatchRatio`.
const DEFAULT_MAX_PATCH_RATIO = 0;

// Upper clamp on the configurable ratio. Past ~half the store a patch stops being meaningfully
// incremental, while worst-case tombstone retention grows as ratio/(1-ratio) of the live set.
const MAX_PATCH_RATIO = 0.5;

/**
 * Internal container for StoreRecord management within a Store.
 * Note this is an immutable object; its update and filtering APIs return new instances as required.
 *
 * A persistent (structurally shared) collection: each instance holds a `base` map - shared with
 * related instances and never mutated - plus an optional small `patch` layer of changed entries
 * (updated/added records, or TOMBSTONEs marking removals). Transactions merge patches at
 * O(patch) cost rather than copying the full map, and two instances sharing a base can derive
 * the exact delta between them at O(patch) via `diffFrom` - the basis for incremental filtering
 * and grid transaction sync. Patches are capped at one layer deep: deriving from a patched set
 * merges into a new single patch, and one invariant governs all paths - a patch never exceeds
 * the configured fraction of its base (`experimental.maxPatchRatio`). Transactions
 * crossing the cap flatten into a fresh base (amortized O(n)); reloads changing more than it
 * simply adopt the incoming map as a new base.
 *
 * The ratio defaults to 0, disabling the patch layer entirely - every change flattens
 * immediately, preserving classic full-copy behavior and source-order records. The ratio is read
 * live on each operation, so it may be set on an existing Store at any time. See
 * {@link StoreConfig.experimental} for the ordering implications of enabling patching.
 *
 * @internal
 */
export class RecordSet {
    store: Store;
    count: number;
    rootCount: number;

    /** Shared base map - never mutated once installed in a RecordSet. */
    readonly base: StoreRecordMap;
    /** Changed entries relative to `base` (TOMBSTONE = removed), or null for a flat set. */
    readonly patch: PatchMap;

    /** Unique id for step-provenance tracking - see `prevOrdinal`. */
    readonly ordinal: number = ++ordinalSeq;
    /** Ordinal of the instance a single-step derivation produced this one from, or null. */
    private prevOrdinal: number = null;
    /** Fields changed in that single step, when the producing transaction supplied them. */
    private changedFields: Set<string> = null;

    private _childrenMap: ChildRecordMap; // children by parentId
    private _list: StoreRecord[]; // all records.
    private _rootList: StoreRecord[]; // root records.
    private _maxDepth: number;
    private _filterSource: RecordSet = null; // source a filtered projection was built from
    private _filter: Filter = null; // filter a projection was built with

    derivation: RecordSetDerivation = null;

    constructor(
        store: Store,
        recordMap: StoreRecordMap = new Map(),
        patch: PatchMap = null,
        count: number = -1,
        rootCount: number = -1
    ) {
        this.store = store;
        this.base = recordMap;
        this.patch = patch?.size ? patch : null;
        this.count = count >= 0 ? count : recordMap.size;
        this.rootCount = rootCount >= 0 ? rootCount : this.countRoots(recordMap);
    }

    get empty(): boolean {
        return this.count === 0;
    }

    getById(id: StoreRecordId): StoreRecord {
        const {patch} = this;
        if (patch) {
            const v = patch.get(id);
            if (v !== undefined) return v === TOMBSTONE ? undefined : v;
        }
        return this.base.get(id);
    }

    /** Iterate all records, reading through any patch layer without materializing a map. */
    forEachRecord(fn: (rec: StoreRecord, id: StoreRecordId) => void) {
        const {base, patch} = this;
        if (!patch) {
            base.forEach(fn);
            return;
        }
        base.forEach((rec, id) => {
            const v = patch.get(id);
            if (v === undefined) fn(rec, id);
            else if (v !== TOMBSTONE) fn(v, id);
        });
        patch.forEach((v, id) => {
            if (v !== TOMBSTONE && !base.has(id)) fn(v, id);
        });
    }

    getDescendantsById(id: StoreRecordId): StoreRecord[] {
        const idSet = new Set<StoreRecordId>();
        this.gatherDescendantIds(id, idSet);
        return Array.from(idSet).map(id => this.getById(id));
    }

    getAncestorsById(id: StoreRecordId): StoreRecord[] {
        const ret = [];
        let cur = this.getById(id);
        while (cur && cur.parent) {
            ret.push(cur.parent);
            cur = cur.parent;
        }

        return ret;
    }

    isEqual(other: RecordSet): boolean {
        if (this.count !== other.count) return false;

        // Sharing a base, equality is answerable from the patches alone.
        if (this.base === other.base) {
            const delta = this.diffFrom(other);
            return !delta.update.length && !delta.add.length && !delta.remove.length;
        }

        let ret = true;
        this.forEachRecord((rec, id) => {
            if (rec !== other.getById(id)) ret = false;
        });
        return ret;
    }

    /**
     * Changes that would derive this RecordSet from `prev` - computed by comparing patch
     * layers at O(patch) when both instances share a base map, by a full scan of both sets
     * otherwise. An empty delta means identical content.
     */
    diffFrom(prev: RecordSet): RecordSetDelta {
        const update = [],
            add = [],
            remove = [];

        if (!prev) return {update, add: this.list, remove};

        // changedFields is only knowable when the window is exactly the single step that
        // produced this instance from `prev`.
        const changedFields = this.prevOrdinal === prev.ordinal ? this.changedFields : null;

        const {base, patch} = this,
            prevPatch = prev.patch;

        // Scan compare
        if (prev.base !== base) {
            this.forEachRecord((rec, id) => {
                const existing = prev.getById(id);
                if (!existing) {
                    add.push(rec);
                } else if (existing !== rec) {
                    update.push(rec);
                }
            });
            if (this.count !== prev.count + add.length) {
                prev.forEachRecord((rec, id) => {
                    if (!this.getById(id)) remove.push(rec);
                });
            }
            return {update, add, remove, changedFields};
        }

        //... or patch compare
        if (patch !== prevPatch) {
            const prevEff = (id: StoreRecordId): StoreRecord => {
                if (prevPatch) {
                    const v = prevPatch.get(id);
                    if (v !== undefined) return v === TOMBSTONE ? undefined : v;
                }
                return base.get(id);
            };

            patch?.forEach((v, id) => {
                const curr = v === TOMBSTONE ? undefined : v,
                    prevRec = prevEff(id);
                if (curr === prevRec) return;
                if (!curr) {
                    if (prevRec) remove.push(prevRec);
                } else if (prevRec) {
                    update.push(curr);
                } else {
                    add.push(curr);
                }
            });

            // Entries patched only in prev (possible when diffing non-derived siblings) - their
            // effective value here comes straight from base.
            prevPatch?.forEach((v, id) => {
                if (patch?.has(id)) return;
                const curr = base.get(id),
                    prevRec = v === TOMBSTONE ? undefined : v;
                if (curr === prevRec) return;
                if (!curr) {
                    if (prevRec) remove.push(prevRec);
                } else if (prevRec) {
                    update.push(curr);
                } else {
                    add.push(curr);
                }
            });
        }

        return {update, add, remove, changedFields};
    }

    /** As `diffFrom`, but only when answerable at O(patch) - null on unrelated instances. */
    deltaFrom(prev: RecordSet): RecordSetDelta {
        return this.hasDeltaFrom(prev) ? this.diffFrom(prev) : null;
    }

    /** True if `deltaFrom` would answer - i.e. this and `prev` share a base map. */
    hasDeltaFrom(prev: RecordSet): boolean {
        return !!prev && prev.base === this.base;
    }

    //----------------------------------------------------------
    // Lazy getters
    // Avoid memory allocation and work -- in many cases
    // clients will never ask for list or tree representations.
    //----------------------------------------------------------
    get childrenMap(): ChildRecordMap {
        if (!this._childrenMap) this._childrenMap = this.computeChildrenMap();
        return this._childrenMap;
    }

    get list(): StoreRecord[] {
        if (!this._list) {
            const list = [];
            this.forEachRecord(rec => list.push(rec));
            this._list = list;
        }
        return this._list;
    }

    get rootList(): StoreRecord[] {
        if (!this._rootList) {
            const {list, count, rootCount} = this;
            this._rootList = count == rootCount ? list : list.filter(r => r.parentId == null);
        }
        return this._rootList;
    }

    get maxDepth(): number {
        if (isNil(this._maxDepth)) {
            const {list, count, rootCount} = this;
            this._maxDepth = count === rootCount ? 0 : maxBy(list, 'depth').depth;
        }
        return this._maxDepth;
    }

    //----------------------------------------------
    // Editing operations that spawn new RecordSets.
    // Preserve all record references we can!
    //-----------------------------------------------
    normalize(target: RecordSet): RecordSet {
        return this.isEqual(target) ? target : this;
    }

    // Caller can pass a `prevFiltered`, if it has one that has the identical filter applied.
    withFilter(filter: Filter, prevFiltered?: RecordSet): RecordSet {
        if (!filter) return this;

        const ret =
            this.withFilterIncremental(filter, prevFiltered) ??
            this.withFilterFull(filter, prevFiltered);
        if (ret !== prevFiltered) {
            ret._filterSource = this;
            ret._filter = filter;
        }
        return ret;
    }

    private withFilterFull(filter: Filter, prevFiltered: RecordSet): RecordSet {
        const {store} = this,
            includeChildren = store.filterIncludesChildren,
            test = filter.getTestFn(store),
            passes = new Map(),
            isMarked = rec => passes.has(rec.id),
            mark = rec => passes.set(rec.id, rec);

        // Pass 1.  Mark all passing records, and potentially their children recursively.
        // Any row already marked will already have all of its children marked, so check can be
        // skipped. Only the children-marking variant can pre-mark - the plain loop visits each
        // record once and skips the isMarked probe entirely.
        if (includeChildren) {
            const childrenMap = this.childrenMap;
            const markChildren = rec => {
                const children = childrenMap.get(rec.id) || [];
                children.forEach(c => {
                    if (!isMarked(c)) {
                        mark(c);
                        markChildren(c);
                    }
                });
            };
            this.forEachRecord(rec => {
                if (!isMarked(rec) && test(rec)) {
                    mark(rec);
                    markChildren(rec);
                }
            });
        } else {
            this.forEachRecord(rec => {
                if (test(rec)) mark(rec);
            });
        }

        // Pass 2) Walk up from any passing roots and make sure all parents are marked
        const markParents = rec => {
            const {parent} = rec;
            if (parent && !isMarked(parent)) {
                mark(parent);
                markParents(parent);
            }
        };
        passes.forEach(rec => markParents(rec));

        // Count changes vs. the previous projection - one lookup per passing record, with removes
        // falling out by arithmetic.
        let update = 0,
            add = 0;
        passes.forEach((rec, id) => {
            const prev = prevFiltered?.getById(id);
            if (!prev) {
                add++;
            } else if (prev !== rec) {
                update++;
            }
        });

        const ret = new RecordSet(this.store, passes);
        ret.derivation = {
            type: 'full',
            update,
            add,
            remove: prevFiltered ? prevFiltered.count - (passes.size - add) : 0
        };
        return ret;
    }

    withNewRecords(recordMap: StoreRecordMap): RecordSet {
        // Reuse existing StoreRecord object instances where possible.
        // If reload changed nothing - preserve instance identity outright.
        // Be sure to finalize any new records that are accepted.
        const changed: StoreRecord[] = []; // accepted new instances - updates and adds
        let adds = 0,
            rootCount = 0;
        recordMap.forEach((newRec, id) => {
            const currRec = this.getById(id);
            if (currRec && this.areRecordsEqual(currRec, newRec)) {
                recordMap.set(id, currRec);
                if (currRec.parentId == null) rootCount++;
            } else {
                newRec.finalize();
                if (!currRec) adds++;
                changed.push(newRec);
                if (newRec.parentId == null) rootCount++;
            }
        });

        const count = recordMap.size,
            removedCount = this.count - (count - adds);
        if (!removedCount && !changed.length) return this;

        // When reuse dominates, express the new set as a patch over the incumbent base -
        // preserving base identity so consumers can derive the (small) reload delta. Otherwise
        // the incoming map simply becomes a fresh base.
        const {store, base, patch} = this,
            ratio = this.patchRatio(),
            changes = changed.length + removedCount,
            counts = {update: changed.length - adds, add: adds, remove: removedCount};

        if (changes <= ratio * count) {
            const newPatch: PatchMap = patch ? new Map(patch) : new Map();
            changed.forEach(rec => newPatch.set(rec.id, rec));
            if (removedCount) {
                this.forEachRecord((rec, id) => {
                    if (!recordMap.has(id)) removeFromPatch(id, newPatch, base);
                });
            }
            if (newPatch.size <= ratio * base.size) {
                const ret = new RecordSet(store, base, newPatch, count, rootCount);
                ret.derivation = {type: 'patched', ...counts};
                return ret;
            }
        }

        const ret = new RecordSet(store, recordMap, null, count, rootCount);
        ret.derivation = {type: 'full', ...counts};
        return ret;
    }

    withTransaction(t: {
        update?: StoreRecord[];
        add?: StoreRecord[];
        remove?: StoreRecordId[];
        changedFields?: Set<string>;
    }): RecordSet {
        const {update, add, remove} = t,
            {base, patch} = this;

        // Merge into a copy of the current patch - O(patch), not O(all records).
        // Be sure to finalize any new records that are accepted.
        const newPatch: PatchMap = patch ? new Map(patch) : new Map();
        let {count, rootCount} = this,
            missingRemoves = 0,
            missingUpdates = 0;

        // Effective record as of this point in the transaction.
        const eff = (id: StoreRecordId): StoreRecord => {
            const v = newPatch.get(id);
            if (v !== undefined) return v === TOMBSTONE ? undefined : v;
            return base.get(id);
        };

        // 0) Removes - process first to allow delete-then-add-elsewhere-in-tree.
        if (remove) {
            const isTree = this.count !== this.rootCount,
                allRemoves = new Set<StoreRecordId>();
            remove.forEach(id => {
                if (!eff(id)) {
                    missingRemoves++;
                    this.store.logDebug(`Attempted to remove non-existent record: ${id}`);
                    return;
                }
                allRemoves.add(id);
                if (isTree) this.gatherDescendantIds(id, allRemoves);
            });
            allRemoves.forEach(id => {
                const rec = eff(id);
                if (!rec) return;
                count--;
                if (rec.parentId == null) rootCount--;
                removeFromPatch(id, newPatch, base);
            });
        }

        // 1) Updates
        if (update) {
            update.forEach(rec => {
                const {id} = rec,
                    existing = eff(id);
                if (!existing) {
                    missingUpdates++;
                    this.store.logDebug(`Attempted to update non-existent record: ${id}`);
                    return;
                }
                newPatch.set(id, rec);
                rec.finalize();
                if (existing.parentId == null) rootCount--;
                if (rec.parentId == null) rootCount++;
            });
        }

        // 2) Adds
        if (add) {
            add.forEach(rec => {
                const {id} = rec;
                throwIf(eff(id), `Attempted to insert duplicate record: ${id}`);
                newPatch.set(id, rec);
                rec.finalize();
                count++;
                if (rec.parentId == null) rootCount++;
            });
        }

        if (missingRemoves > 0)
            logWarn(`Failed to remove ${missingRemoves} records not found by id`, this);
        if (missingUpdates > 0)
            logWarn(`Failed to update ${missingUpdates} records not found by id`, this);

        const ret = this.create(base, newPatch, count, rootCount);
        ret.derivation = {
            type: ret.base === base ? 'patched' : 'flattened',
            update: (update?.length ?? 0) - missingUpdates,
            add: add?.length ?? 0,
            remove: this.count + (add?.length ?? 0) - count
        };
        ret.prevOrdinal = this.ordinal;
        if (t.changedFields && isEmpty(add) && isEmpty(remove)) {
            ret.changedFields = t.changedFields;
        }
        return ret;
    }

    // Incremental arm of withFilter - null when not applicable, directing the caller to the
    // full pass. See withFilter docs for the applicability conditions.
    private withFilterIncremental(filter: Filter, prevFiltered: RecordSet): RecordSet {
        if (
            !prevFiltered ||
            !this.isSameFilter(filter, prevFiltered._filter) ||
            this.count !== this.rootCount ||
            prevFiltered.count !== prevFiltered.rootCount
        ) {
            return null;
        }
        const delta = this.deltaFrom(prevFiltered._filterSource);
        if (!delta) return null;

        const {store} = this,
            test = filter.getTestFn(store),
            fBase = prevFiltered.base,
            newPatch: PatchMap = prevFiltered.patch ? new Map(prevFiltered.patch) : new Map();
        let count = prevFiltered.count,
            added = 0,
            removed = 0,
            updated = 0;

        delta.remove.forEach(rec => {
            const {id} = rec;
            if (prevFiltered.getById(id)) {
                removeFromPatch(id, newPatch, fBase);
                count--;
                removed++;
            }
        });
        delta.update.forEach(rec => {
            const {id} = rec,
                present = !!prevFiltered.getById(id);
            if (test(rec)) {
                newPatch.set(id, rec);
                if (!present) count++;
                present ? updated++ : added++;
            } else if (present) {
                removeFromPatch(id, newPatch, fBase);
                count--;
                removed++;
            }
        });
        delta.add.forEach(rec => {
            if (test(rec)) {
                newPatch.set(rec.id, rec);
                count++;
                added++;
            }
        });

        if (!(added || removed || updated)) return prevFiltered;

        const ret = this.create(fBase, newPatch, count, count);
        ret.derivation = {
            type: ret.base === fBase ? 'patched' : 'flattened',
            update: updated,
            add: added,
            remove: removed
        };
        ret.prevOrdinal = prevFiltered.ordinal;
        if (delta.changedFields && !added && !removed) {
            ret.changedFields = delta.changedFields;
        }
        return ret;
    }

    //------------------------
    // Implementation
    //------------------------
    /**
     * Construct over a base + patch, flattening into a fresh base when the patch has grown past
     * the cap.
     */
    private create(
        base: StoreRecordMap,
        patch: PatchMap,
        count: number,
        rootCount: number
    ): RecordSet {
        const {store} = this;
        return patch.size > this.patchRatio() * base.size
            ? new RecordSet(store, applyPatch(base, patch), null, count, rootCount)
            : new RecordSet(store, base, patch, count, rootCount);
    }

    private isSameFilter(f1: Filter, f2: Filter): boolean {
        return f1 === f2 || f1?.equals(f2);
    }

    /** Max patch size as a fraction of base, clamped to [0, 0.5] - see `experimental.maxPatchRatio`. */
    private patchRatio(): number {
        const ratio = this.store.experimental.maxPatchRatio;
        return ratio == null ? DEFAULT_MAX_PATCH_RATIO : clamp(ratio, 0, MAX_PATCH_RATIO);
    }

    private areRecordsEqual(r1: StoreRecord, r2: StoreRecord): boolean {
        if (r1 === r2) return true;

        const {store} = this;

        // Version check: equal digests certify equal data - compare values directly only for
        // digest-less records. In-place data mutations bump digests while leaving data equal.
        if (r1.digest !== r2.digest) return false;
        if (r1.digest == null) {
            const d1 = r1.data,
                d2 = r2.data;
            // Projection data carries arbitrary provider keys - compare declared fields only.
            const dataEqual = store.projectionOnly
                ? d1 === d2 || store.fields.every(({name}) => equal(d1[name], d2[name]))
                : equal(d1, d2);
            if (!dataEqual) return false;
        }

        return this.positionUnchanged(r1, r2);
    }

    // True if two same-id records from successive loads occupy the same tree position. Compares
    // the records' own (constructor-fixed) treePaths - `StoreRecord.parent` resolves against the
    // pre-swap RecordSet here and cannot be trusted. Mirrors Store.positionUnchanged.
    private positionUnchanged(r1: StoreRecord, r2: StoreRecord): boolean {
        return (
            this.store.idEncodesTreePath ||
            // Root records share an id here, so their paths are equal by construction.
            (r1.parentId == null && r2.parentId == null) ||
            equal(r1.treePath, r2.treePath)
        );
    }

    private computeChildrenMap(): ChildRecordMap {
        const ret = new Map();
        this.forEachRecord(r => {
            const {parent} = r;
            if (parent) {
                const children = ret.get(parent.id);
                if (!children) {
                    ret.set(parent.id, [r]);
                } else {
                    children.push(r);
                }
            }
        });
        return ret;
    }

    private countRoots(recordMap: StoreRecordMap): number {
        let ret = 0;
        recordMap.forEach(rec => {
            if (rec.parentId == null) ret++;
        });
        return ret;
    }

    private gatherDescendantIds(id: StoreRecordId, idSet: Set<StoreRecordId>): Set<StoreRecordId> {
        this.childrenMap.get(id)?.forEach(child => {
            if (!idSet.has(child.id)) {
                // paranoia? did we encounter loops?
                idSet.add(child.id);
                this.gatherDescendantIds(child.id, idSet);
            }
        });
        return idSet;
    }
}

//------------------------
// Patch-layer helpers - pure functions over explicit (base, patch) pairs, which do not always
// belong to the operating instance (incremental filtering works over the previous projection's).
//------------------------
/** Record a removal in a patch: tombstone base entries, drop patch-only adds outright. */
function removeFromPatch(id: StoreRecordId, patch: PatchMap, base: StoreRecordMap) {
    base.has(id) ? patch.set(id, TOMBSTONE) : patch.delete(id);
}

/** Flatten a patch into a fresh map - in-place updates and appended adds preserve order. */
function applyPatch(base: StoreRecordMap, patch: PatchMap): StoreRecordMap {
    const ret = new Map(base);
    patch.forEach((v, id) => (v === TOMBSTONE ? ret.delete(id) : ret.set(id, v)));
    return ret;
}

/** How a RecordSet instance was derived - counts only, consumed by diagnostics. @internal */
export interface RecordSetDerivation {
    type: 'patched' | 'flattened' | 'full' | 'unchanged';
    update: number;
    add: number;
    remove: number;
}
