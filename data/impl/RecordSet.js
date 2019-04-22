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
 * Note this is an immutable object; its update and filtering APIs return new instances as required.
 *
 * @private
 */
export class RecordSet {

    store;
    records;        // Records by id
    childrenMap;    // Children by parentId
    _list;          // Lazy, list representation of all records.

    constructor(store, records = new Map()) {
        this.store = store;
        this.records = records;

        const childrenMap = this.childrenMap = new Map();
        records.forEach(record => {
            const {parentId} = record,
                children = childrenMap.get(parentId);
            if (!children) {
                childrenMap.set(parentId, [record]);
            } else {
                children.push(record);
            }
        });
    }

    get count() {
        return this.records.size;
    }

    get list() {
        if (!this._list) {
            this._list = Array.from(this.records.values());
        }
        return this._list;
    }

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

    removeRecord(id) {
        const filter = (rec) => {
            if (rec.id == id) return false;
            const {parent} = rec;
            if (parent && !filter(parent)) return false;
            return true;
        };

        return this.applyFilter(filter);
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
}