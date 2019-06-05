/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js/';
import {Record} from '../Record';

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

        const passes = new Map(),
            {records} = this;

        // A record that passes the filter also recursively passes all its parents.
        const markPass = (rec) => {
            if (passes.has(rec.id)) return;
            passes.set(rec.id, rec);
            const {parent} = rec;
            if (parent) markPass(parent);
        };

        records.forEach(rec => {
            if (filter(rec)) markPass(rec);
        });

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
            if (!currRecord || !currRecord.isEqual(newRecord)) {
                existingRecords.set(id, newRecord);
            }
        });

        return new RecordSet(this.store, existingRecords);
    }

    removeRecords(ids) {
        const removes = new Set();
        ids.forEach(id => this.gatherDescendants(id, removes));
        return this.applyFilter(r => !removes.has(r.id));
    }

    //------------------------
    // Implementation
    //------------------------
    createRecords(rawData) {
        const ret = new Map();
        rawData.forEach(raw => this.createRecord(raw, ret, null));
        return ret;
    }

    createRecord(raw, records, parent) {
        const {store} = this;

        let data = raw;
        if (store.processRawData) {
            data = store.processRawData(raw);
            throwIf(!data, 'processRawData should return an object. If writing/editing, be sure to return a clone!');
        }

        const rec = new Record({data, raw, parent, store});
        throwIf(
            records.has(rec.id),
            `ID ${rec.id} is not unique. Use the 'Store.idSpec' config to resolve a unique ID for each record.`
        );
        records.set(rec.id, rec);
        if (data.children) {
            data.children.forEach(rawChild => this.createRecord(rawChild, records, rec));
        }
    }

    computeChildrenMap(records) {
        const ret = new Map();
        records.forEach(r => {
            const {parentId} = r;
            if (parentId) {
                const children = ret.get(parentId);
                if (!children) {
                    ret.set(parentId, [r]);
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