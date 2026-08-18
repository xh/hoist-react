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
import {Store} from '../Store';
import {Filter} from '../filter/Filter';

type StoreRecordMap = Map<StoreRecordId, StoreRecord>;
type ChildRecordMap = Map<StoreRecordId, StoreRecord[]>;

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
}

/**
 * Internal container for StoreRecord management within a Store.
 * Note this is an immutable object; its update and filtering APIs return new instances as required.
 *
 * @internal
 */
export class RecordSet {
    store: Store;
    count: number;
    rootCount: number;

    private _recordMap: StoreRecordMap; // Map of all Records by id
    private _childrenMap: ChildRecordMap; // children by parentId
    private _list: StoreRecord[]; // all records.
    private _rootList: StoreRecord[]; // root records.
    private _maxDepth: number;

    derivation: RecordSetDerivation = null;

    constructor(store: Store, recordMap: StoreRecordMap = new Map()) {
        this.store = store;
        this._recordMap = recordMap;
        this.count = recordMap.size;
        this.rootCount = this.countRoots(recordMap);
    }

    get empty(): boolean {
        return this.count === 0;
    }

    getById(id: StoreRecordId): StoreRecord {
        return this._recordMap.get(id);
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

        for (const [id, rec] of this._recordMap) {
            if (rec !== other.getById(id)) return false;
        }

        return true;
    }

    /**
     * Changes that would derive this RecordSet from `prev` - the delta contract consumed by
     * Grid to sync ag-Grid transactionally.
     */
    diffFrom(prev: RecordSet): RecordSetDelta {
        const update = [],
            add = [],
            remove = [];

        if (!prev) return {update, add: this.list, remove};

        this._recordMap.forEach((rec, id) => {
            const existing = prev.getById(id);
            if (!existing) {
                add.push(rec);
            } else if (existing !== rec) {
                update.push(rec);
            }
        });

        if (this.count !== prev.count + add.length) {
            prev._recordMap.forEach((rec, id) => {
                if (!this.getById(id)) remove.push(rec);
            });
        }

        return {update, add, remove};
    }

    /**
     * As `diffFrom`, but only provided if cheaply derivable (i.e. without a full scan).
     * Always null for this implementation.
     */
    deltaFrom(prev: RecordSet): RecordSetDelta {
        return null;
    }

    /** True if `deltaFrom` would answer. Always false for this implementation. */
    hasDeltaFrom(prev: RecordSet): boolean {
        return false;
    }

    //----------------------------------------------------------
    // Lazy getters
    // Avoid memory allocation and work -- in many cases
    // clients will never ask for list or tree representations.
    //----------------------------------------------------------
    get childrenMap(): ChildRecordMap {
        if (!this._childrenMap) this._childrenMap = this.computeChildrenMap(this._recordMap);
        return this._childrenMap;
    }

    get list(): StoreRecord[] {
        if (!this._list) this._list = Array.from(this._recordMap.values());
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

    // This implementation always filters in full - `prevFiltered` (the previous projection) is
    // consulted only to count the changes for diagnostics.
    withFilter(filter: Filter, prevFiltered: RecordSet): RecordSet {
        if (!filter) return this;
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
            this._recordMap.forEach(rec => {
                if (!isMarked(rec) && test(rec)) {
                    mark(rec);
                    markChildren(rec);
                }
            });
        } else {
            this._recordMap.forEach(rec => {
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
        // If reload changed nothing - preserve instance identity outright,
        // Be sure to finalize any new records that are accepted.
        let reused = 0,
            adds = 0;
        recordMap.forEach((newRec, id) => {
            const currRec = this.getById(id);
            if (currRec && this.areRecordsEqual(currRec, newRec)) {
                recordMap.set(id, currRec);
                reused++;
            } else {
                if (!currRec) adds++;
                newRec.finalize();
            }
        });

        const count = recordMap.size;
        if (reused === count && reused === this.count) return this;

        const ret = new RecordSet(this.store, recordMap);
        ret.derivation = {
            type: 'full',
            update: count - reused - adds,
            add: adds,
            remove: this.count - (count - adds)
        };
        return ret;
    }

    withTransaction(t: {
        update?: StoreRecord[];
        add?: StoreRecord[];
        remove?: StoreRecordId[];
    }): RecordSet {
        const {update, add, remove} = t;

        // Be sure to finalize any new records that are accepted.
        const newRecords = new Map(this._recordMap);

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
            });
        }

        // 2) Adds
        if (add) {
            add.forEach(rec => {
                const {id} = rec;
                throwIf(newRecords.has(id), `Attempted to insert duplicate record: ${id}`);
                newRecords.set(id, rec);
                rec.finalize();
            });
        }

        if (missingRemoves > 0)
            logWarn(`Failed to remove ${missingRemoves} records not found by id`, this);
        if (missingUpdates > 0)
            logWarn(`Failed to update ${missingUpdates} records not found by id`, this);

        const ret = new RecordSet(this.store, newRecords);
        ret.derivation = {
            type: 'full',
            update: (update?.length ?? 0) - missingUpdates,
            add: add?.length ?? 0,
            remove: this.count + (add?.length ?? 0) - newRecords.size
        };
        return ret;
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

/** How a RecordSet instance was derived - counts only, stamped by Store. @internal */
export interface RecordSetDerivation {
    type: 'patched' | 'flattened' | 'full' | 'unchanged';
    update: number;
    add: number;
    remove: number;
}
