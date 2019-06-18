/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {throwIf} from '../../utils/js';
import {isEmpty} from 'lodash';

/**
 * Internal container for Record management within a Store.
 *
 * Note this is an immutable object; its update and filtering APIs return new instances as required.
 *
 * @private
 */
export class RecordSet {

    store;
    records;        // Records by id
    count;
    rootCount;

    _childrenMap;   // Lazy map of children by parentId
    _list;          // Lazy list of all records.
    _rootList;      // Lazy list of root records.

    constructor(store, records = new Map()) {
        this.store = store;
        this.records = records;
        this.count = records.size;
        this.rootCount = this.countRoots(records);
    }

    //----------------------------------------------------------
    // Lazy getters
    // Avoid memory allocation and work -- in many cases
    // clients will never ask for list or tree representations.
    //----------------------------------------------------------
    get childrenMap() {
        if (!this._childrenMap) this._childrenMap = this.computeChildrenMap(this.records);
        return this._childrenMap;
    }

    get list() {
        if (!this._list) this._list = Array.from(this.records.values());
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
    // Editing operations that spawn new recordsets.
    // Preserve all record references we can!
    //-----------------------------------------------
    applyFilter(filter) {
        if (!filter) return this;
        const {fn, includeChildren} = filter;

        const passes = new Map(),
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
        this.records.forEach(rec => {
            if (!isMarked(rec) && fn(rec)) {
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

    loadData(rawData) {
        const {records} = this,
            newRecords = this.createRecords(rawData);

        if (records.size) {
            const newKeys = newRecords.keys();
            for (let key of newKeys) {
                const currRec = records.get(key),
                    newRec = newRecords.get(key);

                if (currRec && currRec.isEqual(newRec)) {
                    newRecords.set(key, currRec);
                }
            }
        }

        return new RecordSet(this.store, newRecords);
    }

    updateData(rawData) {
        const newRecords = this.createRecords(rawData),
            existingRecords = new Map(this.records);

        newRecords.forEach((newRecord, id) => {
            const currRecord = existingRecords.get(id);

            if (currRecord) {
                throwIf(newRecord.parent && newRecord.parent.id !== newRecord.parent.id, 'Cannot change parents via updateData!');
                newRecord.parent = currRecord.parent;
            }

            // We need to make sure we deal with any orphans as a result of this update
            // If we have a currRecord, and it has children, then make sure that we remove all children
            // which ARE NOT in the newRecords map
            // TODO: This will cause us to create the children map if we haven't already, can we avoid this?
            if (!isEmpty(currRecord.children)) {
                const descendantIds = new Set();
                this.gatherDescendants(currRecord.id, descendantIds);
                descendantIds.forEach(id => {
                    if (!newRecords.has(id)) existingRecords.delete(id);
                });
            }

            if (!currRecord || !currRecord.isEqual(newRecord)) {
                existingRecords.set(id, newRecord);
            }
        });

        return new RecordSet(this.store, existingRecords);
    }

    addData(rawData, parentId) {
        const parent = this.records.get(parentId),
            newRecords = this.createRecords(rawData, parent),
            records = new Map([...this.records, ...newRecords]);

        // TODO: Should we throw if any of the new records have the same id as existing records?

        return new RecordSet(this.store, records);
    }

    removeRecords(ids) {
        const removes = new Set();
        ids.forEach(id => this.gatherDescendants(id, removes));
        return this.applyFilter({fn: r => !removes.has(r.id)});
    }

    //------------------------
    // Implementation
    //------------------------

    createRecords(rawData, parent = null) {
        const ret = new Map();
        rawData.forEach(raw => this.buildRecords(raw, ret, parent));
        return ret;
    }

    buildRecords(raw, records, parent) {
        const rec = this.store.createRecord(raw, parent);
        throwIf(
            records.has(rec.id),
            `ID ${rec.id} is not unique. Use the 'Store.idSpec' config to resolve a unique ID for each record.`
        );

        records.set(rec.id, rec);

        if (raw.children) {
            raw.children.forEach(rawChild => this.buildRecords(rawChild, records, rec));
        }
    }

    computeChildrenMap(records) {
        const ret = new Map();
        records.forEach(r => {
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

    countRoots(records) {
        let ret = 0;
        records.forEach(rec => {
            if (rec.parentId == null) ret++;
        });
        return ret;
    }

    gatherDescendants(id, idSet) {
        if (!idSet.has(id)) {
            idSet.add(id);
            const children = this.childrenMap.get(id);
            if (children) {
                children.forEach(child => this.gatherDescendants(child.id, idSet));
            }
        }
    }
}