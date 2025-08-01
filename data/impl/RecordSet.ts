/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import equal from 'fast-deep-equal';
import {logWarn, throwIf} from '@xh/hoist/utils/js';
import {maxBy, isNil} from 'lodash';
import {StoreRecord, StoreRecordId} from '../StoreRecord';
import {Store} from '../Store';
import {Filter} from '../filter/Filter';
import type {RsTransaction} from '@xh/hoist/data/Types';

/**
 * Internal container for StoreRecord management within a Store.
 * Note this is an immutable object; its update and filtering APIs return new instances as required.
 *
 * @internal
 */
type StoreRecordMap = Map<StoreRecordId, StoreRecord>;
type ChildRecordMap = Map<StoreRecordId, StoreRecord[]>;

export class RecordSet {
    store: Store;
    recordMap: StoreRecordMap; // Map of all Records by id
    count: number;
    rootCount: number;

    private _childrenMap: ChildRecordMap; // children by parentId
    private _list: StoreRecord[]; // all records.
    private _rootList: StoreRecord[]; // root records.
    private _maxDepth: number;

    constructor(store: Store, recordMap: StoreRecordMap = new Map()) {
        this.store = store;
        this.recordMap = recordMap;
        this.count = recordMap.size;
        this.rootCount = this.countRoots(recordMap);
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
            recordMap.forEach(r => r.finalize());
        } else {
            recordMap.forEach((newRec, id) => {
                const currRec = this.getById(id);
                if (currRec && this.areRecordsEqual(currRec, newRec)) {
                    recordMap.set(id, currRec);
                } else {
                    newRec.finalize();
                }
            });
        }

        return new RecordSet(this.store, recordMap);
    }

    withTransaction(t: RsTransaction): RecordSet {
        const {update, add, remove} = t;

        // Be sure to finalize any new records that are accepted.
        const {recordMap} = this,
            newRecords = new Map(recordMap);

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

        return new RecordSet(this.store, newRecords);
    }

    //------------------------
    // Implementation
    //------------------------
    private areRecordsEqual(r1: StoreRecord, r2: StoreRecord): boolean {
        return (
            r1 === r2 ||
            (equal(r1.data, r2.data) &&
                (this.store.idEncodesTreePath || equal(r1.treePath, r2.treePath)))
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
