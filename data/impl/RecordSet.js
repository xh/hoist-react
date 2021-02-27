/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import equal from 'fast-deep-equal';
import {throwIf} from '@xh/hoist/utils/js';
import {logDebug, withShortDebug} from '../../utils/js';

/**
 * Internal container for Record management within a Store.
 *
 * Note this is an immutable object; its update and filtering APIs return new instances as required.
 *
 * @private
 */
export class RecordSet {

    store;
    recordMap;      // Map of all Records by id
    count;
    rootCount;

    _childrenMap;   // Lazy map of children by parentId
    _list;          // Lazy list of all records.
    _rootList;      // Lazy list of root records.

    constructor(store, recordMap = new Map()) {
        this.store = store;
        this.recordMap = recordMap;
        this.count = recordMap.size;
        this.rootCount = this.countRoots(recordMap);
    }

    get empty() {
        return this.count === 0;
    }

    getById(id) {
        return this.recordMap.get(id);
    }

    getDescendantsById(id) {
        const idSet = new Set();
        this.gatherDescendantIds(id, idSet);
        return Array.from(idSet).map(id => this.getById(id));
    }

    getAncestorsById(id) {
        const ret = [];
        let cur = this.getById(id);
        while (cur && cur.parent) {
            ret.push(cur.parent);
            cur = cur.parent;
        }

        return ret;
    }

    isEqual(other) {
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
    get childrenMap() {
        if (!this._childrenMap) this._childrenMap = this.computeChildrenMap(this.recordMap);
        return this._childrenMap;
    }

    get list() {
        if (!this._list) this._list = Array.from(this.recordMap.values());
        return this._list;
    }

    get rootList() {
        if (!this._rootList) {
            const {list, count, rootCount} = this;
            this._rootList = (count == rootCount ? list : list.filter(r => r.parentId == null));
        }
        return this._rootList;
    }

    //----------------------------------------------
    // Editing operations that spawn new RecordSets.
    // Preserve all record references we can!
    //-----------------------------------------------
    normalize(target) {
        return this.isEqual(target) ? target : this;
    }

    withFilter(filter) {
        if (!filter) return this;
        const {store} = this,
            includeChildren = store.filterIncludesChildren,
            test = filter.getTestFn(store),
            passes = new Map(),
            isMarked = (rec) => passes.has(rec.id),
            mark = (rec) => passes.set(rec.id, rec);

        // Pass 1.  Mark all passing records, and potentially their children recursively.
        // Any row already marked will already have all of its children marked, so check can be skipped
        let markChildren;
        if (includeChildren) {
            const childrenMap = this.childrenMap;
            markChildren = (rec) => {
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
        const markParents = (rec) => {
            const {parent} = rec;
            if (parent && !isMarked(parent)) {
                mark(parent);
                markParents(parent);
            }
        };
        passes.forEach(rec => markParents(rec));

        return new RecordSet(this.store, passes);
    }

    withNewRecords(recordMap) {
        withShortDebug('withNewRecords', () => {

            // Reuse existing Record object instances where possible.  See Store.loadData().
            // Be sure to freeze any new records that are accepted.  See Record.freeze()
            if (this.empty) {
                recordMap.forEach(r => r.freeze());
            } else {
                const newIds = recordMap.keys();
                for (let id of newIds) {
                    const currRec = this.getById(id),
                        newRec = recordMap.get(id);

                    if (currRec && this.areRecordsEqual(currRec, newRec)) {
                        recordMap.set(id, currRec);
                    } else {
                        newRec.freeze();
                    }
                }
            }
        }, this.store);

        return new RecordSet(this.store, recordMap);
    }

    withTransaction({update, add, remove}) {
        // Be sure to freeze any new records that are accepted.  See Record.freeze()
        const {recordMap} = this,
            newRecords = new Map(recordMap);

        let missingRemoves = 0, missingUpdates = 0;

        // 0) Removes - process first to allow delete-then-add-elsewhere-in-tree.
        if (remove) {
            const allRemoves = new Set();
            remove.forEach(id => {
                if (!newRecords.has(id)) {
                    missingRemoves++;
                    logDebug(`Attempted to remove non-existent record: ${id}`, this.store);
                    return;
                }
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
                    logDebug(`Attempted to update non-existent record: ${id}`, this.store);
                    return;
                }
                newRecords.set(id, rec);
                rec.freeze();
            });
        }

        // 2) Adds
        if (add) {
            add.forEach(rec => {
                const {id} = rec;
                throwIf(newRecords.has(id), `Attempted to insert duplicate record: ${id}`);
                newRecords.set(id, rec);
                rec.freeze();
            });
        }

        if (missingRemoves > 0) console.warn(`Failed to remove ${missingRemoves} records not found by id`);
        if (missingUpdates > 0) console.warn(`Failed to update ${missingUpdates} records not found by id`);

        return new RecordSet(this.store, newRecords);
    }

    //------------------------
    // Implementation
    //------------------------
    areRecordsEqual(rec1, rec2) {
        return equal(rec1.treePath, rec2.treePath) && equal(rec1.data, rec2.data);
    }

    computeChildrenMap(recordMap) {
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

    countRoots(recordMap) {
        let ret = 0;
        recordMap.forEach(rec => {
            if (rec.parentId == null) ret++;
        });
        return ret;
    }

    gatherDescendantIds(id, idSet) {
        if (!idSet.has(id)) {
            idSet.add(id);
            const children = this.childrenMap.get(id);
            if (children) {
                children.forEach(child => this.gatherDescendantIds(child.id, idSet));
            }
        }

        return idSet;
    }
}
