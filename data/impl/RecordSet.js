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
        const updatedRecords = new Map(),
            {store, records} = this,
            updateRoots = [];

        // 1. When updating we need to first create records for the root data, and make sure we carry
        //    the parent record forward if this new data matches an existing record. Then we can build
        //    the descendent records with the confidence that their parent and tree paths will be correct
        rawData.forEach(data => {
            const rec = store.createRecord(data),
                existingRecord = records.get(rec.id);

            // Since our raw data does not include parent information, only children, we need to
            // make sure that we copy the parent over from the existing record when updating
            if (existingRecord) rec.parent = existingRecord.parent;

            updatedRecords.set(rec.id, rec);
            updateRoots.push(rec);
            if (!isEmpty(data.children)) {
                data.children.forEach(childData => this.buildRecords(childData, updatedRecords, rec));
            }
        });

        // 2. If this record set contains hierarchical data then we need to figure out which (if any)
        //    existing records need to be removed from the record set as part of this update operation
        const recordIdsToRemove = new Set(),
            {childrenMap} = this;

        if (childrenMap.size) {
            updateRoots.forEach(rec => {
                // When the existing record has descendents which are not part of the updated data
                // they need to be removed from the record set
                if (childrenMap.has(rec.id)) {
                    const descendantIds = this.gatherDescendants(rec.id);
                    descendantIds.forEach(id => {
                        if (!updatedRecords.has(id)) recordIdsToRemove.add(id);
                    });
                }
            });
        }

        // 3. Build the new map of records
        const newRecords = new Map(records);
        updatedRecords.forEach((record, id) => {
            const currRecord = records.get(id);
            if (!currRecord || !currRecord.isEqual(record)) {
                newRecords.set(id, record);
            }
        });

        recordIdsToRemove.forEach(id => newRecords.delete(id));

        return new RecordSet(store, newRecords);
    }


    updateRecords(updates) {
        const {store, records} = this;

        // 1) Create new records
        const allNewRecords = updates.map(update => store.createRecord(update)),
            newRecords = allNewRecords.filter(rec => records.get(rec.id));
        if (allNewRecords.length != newRecords.length) {
            console.warn(`Skipped ${allNewRecords.length - newRecords.length} unknown records in updateRecords()`);
        }

        // 2) Overlay on existing
        const newRecordsMap = new Map(records);
        newRecords.forEach(rec => newRecordsMap.set(rec.id, rec));

        // 3) Adjust parents for all new records
        newRecords.forEach(rec => {
            const existingRec = records.get(rec.id),
                parent = existingRec.parentId ? newRecordsMap.get(existingRec.parentId) : null;
            if (parent) {
                rec.parent = parent;
            }
        });

        console.log(newRecordsMap);

        return new RecordSet(store, newRecordsMap);
    }

    addData(rawData, parentId) {
        const {records} = this,
            parent = records.get(parentId),
            newRecords = this.createRecords(rawData, parent);

        newRecords.forEach(rec => {
            throwIf(records.has(rec.id),
                `A Record with ID ${rec.id} already exists in the RecordSet.`);
        });

        return new RecordSet(this.store, new Map([...records, ...newRecords]));
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

    gatherDescendants(id, idSet = new Set()) {
        if (!idSet.has(id)) {
            idSet.add(id);
            const children = this.childrenMap.get(id);
            if (children) {
                children.forEach(child => this.gatherDescendants(child.id, idSet));
            }
        }

        return idSet;
    }
}