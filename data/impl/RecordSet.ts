/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import equal from 'fast-deep-equal';
import {logWarn, throwIf} from '@xh/hoist/utils/js';
import {maxBy, isNil} from 'lodash';
import {StoreRecord, StoreRecordId} from '../StoreRecord';
import {RecordTransaction, Store} from '../Store';
import {Filter} from '../filter/Filter';

type StoreRecordMap = Map<StoreRecordId, StoreRecord>;
type ChildRecordMap = Map<StoreRecordId, StoreRecord[]>;

// Monotonic source for RecordSet.xhId - identifies instances for delta linkage.
let nextXhId = 0;

// Attach a load delta (see withNewRecords) only when reuse dominates - a large delta costs
// consumers more to apply than their full-rebuild fallbacks.
const MAX_LOAD_DELTA_RATIO = 0.25;

/**
 * Changes applied to a source RecordSet (identified by `prevId`) to produce a derived one.
 * Unlike a RecordTransaction used to *specify* changes, `remove` here holds the full expanded
 * set of removed ids, including cascaded descendants - consumers apply it verbatim.
 * @internal
 */
export interface RecordSetDelta extends RecordTransaction {
    prevId: number;
    update: StoreRecord[];
    add: StoreRecord[];
    remove: StoreRecordId[];
}

/**
 * Internal container for StoreRecord management within a Store.
 * Note this is an immutable object; its update and filtering APIs return new instances as required.
 *
 * @internal
 */
export class RecordSet {
    store: Store;
    recordMap: StoreRecordMap; // Map of all Records by id
    count: number;
    rootCount: number;

    /** Unique instance id, identifying this set as the source of derived sets' `delta`s. */
    readonly xhId: number = ++nextXhId;

    /**
     * Changes that produced this RecordSet from the instance identified by `delta.prevId` -
     * populated when derived via `withTransaction` or an incremental filter patch, null when
     * built any other way (full load, full filter). Lets consumers (e.g. Grid) sync small
     * changes without a full-list diff.
     */
    readonly delta: RecordSetDelta = null;

    private _childrenMap: ChildRecordMap; // children by parentId
    private _list: StoreRecord[]; // all records.
    private _rootList: StoreRecord[]; // root records.
    private _maxDepth: number;

    constructor(store: Store, recordMap: StoreRecordMap = new Map(), delta: RecordSetDelta = null) {
        this.store = store;
        this.recordMap = recordMap;
        this.count = recordMap.size;
        this.rootCount = this.countRoots(recordMap);
        this.delta = delta;
    }

    get empty(): boolean {
        return this.count === 0;
    }

    getById(id: StoreRecordId): StoreRecord {
        return this.recordMap.get(id);
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

        for (const [id, rec] of this.recordMap) {
            if (rec !== other.recordMap.get(id)) return false;
        }

        return true;
    }

    //----------------------------------------------------------
    // Lazy getters
    // Avoid memory allocation and work -- in many cases
    // clients will never ask for list or tree representations.
    //----------------------------------------------------------
    get childrenMap(): ChildRecordMap {
        if (!this._childrenMap) this._childrenMap = this.computeChildrenMap(this.recordMap);
        return this._childrenMap;
    }

    get list(): StoreRecord[] {
        if (!this._list) this._list = Array.from(this.recordMap.values());
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

    withFilter(filter: Filter): RecordSet {
        if (!filter) return this;
        const {store} = this,
            includeChildren = store.filterIncludesChildren,
            test = filter.getTestFn(store),
            passes = new Map(),
            isMarked = rec => passes.has(rec.id),
            mark = rec => passes.set(rec.id, rec);

        // Pass 1.  Mark all passing records, and potentially their children recursively.
        // Any row already marked will already have all of its children marked, so check can be skipped
        let markChildren;
        if (includeChildren) {
            const childrenMap = this.childrenMap;
            markChildren = rec => {
                const children = childrenMap.get(rec.id) || [];
                children.forEach(c => {
                    if (!isMarked(c)) {
                        mark(c);
                        markChildren(c);
                    }
                });
            };
        }
        this.recordMap.forEach(rec => {
            if (!isMarked(rec) && test(rec)) {
                mark(rec);
                if (includeChildren) markChildren(rec);
            }
        });

        // Pass 2) Walk up from any passing roots and make sure all parents are marked
        const markParents = rec => {
            const {parent} = rec;
            if (parent && !isMarked(parent)) {
                mark(parent);
                markParents(parent);
            }
        };
        passes.forEach(rec => markParents(rec));

        return new RecordSet(this.store, passes);
    }

    withNewRecords(recordMap: StoreRecordMap): RecordSet {
        // Reuse existing StoreRecord object instances where possible.  See Store.loadData().
        // Be sure to finalize any new records that are accepted.
        if (this.empty) {
            if (!recordMap.size) return this;
            recordMap.forEach(r => r.finalize());
            return new RecordSet(this.store, recordMap);
        }

        // Classify against the incumbents while reusing - reused records are no-ops, the rest
        // form this set's delta from its predecessor.
        const delta: RecordSetDelta = {prevId: this.xhId, update: [], add: [], remove: []};
        recordMap.forEach((newRec, id) => {
            const currRec = this.getById(id);
            if (currRec && this.areRecordsEqual(currRec, newRec)) {
                recordMap.set(id, currRec);
            } else {
                newRec.finalize();
                (currRec ? delta.update : delta.add).push(newRec);
            }
        });

        // Reload changed nothing - preserve instance identity outright, letting the Store skip
        // its refilter and downstream consumers skip all sync. Common in polling apps.
        const removedCount = this.count - (recordMap.size - delta.add.length);
        if (!removedCount && !delta.update.length && !delta.add.length) return this;

        if (removedCount) {
            for (const id of this.recordMap.keys()) {
                if (!recordMap.has(id)) delta.remove.push(id);
            }
        }

        const changes = delta.update.length + delta.add.length + delta.remove.length,
            attachDelta = changes <= MAX_LOAD_DELTA_RATIO * recordMap.size;
        return new RecordSet(this.store, recordMap, attachDelta ? delta : null);
    }

    withTransaction(t: RecordTransaction): RecordSet {
        const {update, add, remove} = t;

        // Be sure to finalize any new records that are accepted.
        const {recordMap} = this,
            newRecords = new Map(recordMap),
            delta: RecordSetDelta = {prevId: this.xhId, update: [], add: [], remove: []};

        let missingRemoves = 0,
            missingUpdates = 0;

        // 0) Removes - process first to allow delete-then-add-elsewhere-in-tree.
        if (remove) {
            const allRemoves = new Set<StoreRecordId>();
            remove.forEach(id => {
                if (!newRecords.has(id)) {
                    missingRemoves++;
                    this.store.logDebug(`Attempted to remove non-existent record: ${id}`);
                    return;
                }
                allRemoves.add(id);
                this.gatherDescendantIds(id, allRemoves);
            });
            allRemoves.forEach(it => newRecords.delete(it));
            delta.remove = Array.from(allRemoves);
        }

        // 1) Updates
        if (update) {
            update.forEach(rec => {
                const {id} = rec,
                    existing = newRecords.get(id);
                if (!existing) {
                    missingUpdates++;
                    this.store.logDebug(`Attempted to update non-existent record: ${id}`);
                    return;
                }
                newRecords.set(id, rec);
                rec.finalize();
                delta.update.push(rec);
            });
        }

        // 2) Adds
        if (add) {
            add.forEach(rec => {
                const {id} = rec;
                throwIf(newRecords.has(id), `Attempted to insert duplicate record: ${id}`);
                newRecords.set(id, rec);
                rec.finalize();
                delta.add.push(rec);
            });
        }

        if (missingRemoves > 0)
            logWarn(`Failed to remove ${missingRemoves} records not found by id`, this);
        if (missingUpdates > 0)
            logWarn(`Failed to update ${missingUpdates} records not found by id`, this);

        return new RecordSet(this.store, newRecords, delta);
    }

    /**
     * Filtered projection of this RecordSet, built by patching the previous filtered set with
     * this set's delta rather than re-testing every record. Applicable only when this set was
     * derived from `prevFiltered`'s source (identified by `prevSourceId`) via a single
     * transaction, and both states are flat - hierarchy-aware marking (ancestors of passing
     * records, optionally their children) requires the full `withFilter` pass.
     *
     * Returns `prevFiltered` itself when the changes turn out not to touch the filtered set at
     * all (e.g. updates only to filtered-out records), and null when not applicable - callers
     * must then fall back to `withFilter`.
     */
    withFilterIncremental(
        filter: Filter,
        prevFiltered: RecordSet,
        prevSourceId: number
    ): RecordSet {
        const {delta, store} = this;
        if (
            !delta ||
            delta.prevId !== prevSourceId ||
            this.count !== this.rootCount ||
            prevFiltered.count !== prevFiltered.rootCount
        ) {
            return null;
        }

        const test = filter.getTestFn(store),
            newMap = new Map(prevFiltered.recordMap),
            fDelta: RecordSetDelta = {prevId: prevFiltered.xhId, update: [], add: [], remove: []};

        delta.remove.forEach(id => {
            if (newMap.delete(id)) fDelta.remove.push(id);
        });
        delta.update.forEach(rec => {
            const {id} = rec,
                present = newMap.has(id);
            if (test(rec)) {
                newMap.set(id, rec);
                (present ? fDelta.update : fDelta.add).push(rec);
            } else if (present) {
                newMap.delete(id);
                fDelta.remove.push(id);
            }
        });
        delta.add.forEach(rec => {
            if (test(rec)) {
                newMap.set(rec.id, rec);
                fDelta.add.push(rec);
            }
        });

        return fDelta.update.length || fDelta.add.length || fDelta.remove.length
            ? new RecordSet(store, newMap, fDelta)
            : prevFiltered;
    }

    //------------------------
    // Implementation
    //------------------------
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

    private computeChildrenMap(recordMap: StoreRecordMap): ChildRecordMap {
        const ret = new Map();
        recordMap.forEach(r => {
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
