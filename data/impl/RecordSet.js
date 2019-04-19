/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {isString, isNil, partition} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js/';
import {Record} from '../Record';

/**
 * Internal container for Record management within a Store.
 * Note this is an immutable object; its update and filtering APIs return new instances as required.
 *
 * @private
 */
export class RecordSet {

    /** @member {BaseStore} - source store. */
    store;
    /** @member {Map} - map of all records by id. */
    records;

    /** @member {Record[]} - lazily constructed array of Records. */
    _list;
    /** @member {RecordNode[]} - lazily constructed array of root RecordNodes. */
    _tree;

    /**
     * @param {BaseStore} store
     * @param {Map} [records]
     */
    constructor(store, records = new Map()) {
        this.records = records;
        this.store = store;
    }

    /** Total number of records contained in this RecordSet. */
    get count() {
        return this.records.size;
    }

    /** All records as a flat list. */
    get list() {
        if (!this._list) {
            this._list = Array.from(this.records.values());
        }
        return this._list;
    }

    /** All records in a tree representation. */
    get tree() {
        if (!this._tree) {
            this._tree = this.toTree();
        }
        return this._tree;
    }

    /**
     * Return a filtered version of this RecordSet.
     *
     * @param {function} filter - if null, this method will return the RecordSet itself.
     * @return {RecordSet}
     */
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

    /**
     * Create a new RecordSet with new rawData to replace this instance.
     *
     * Note that this process will re-use pre-existing Records if they are present in the new
     * dataset (as identified by their ID), contain the same data, and occupy the same place in any
     * hierarchy across old and new loads.
     *
     * This is to maximize the ability of downstream consumers (e.g. ag-Grid) to recognize Records
     * that have not changed and do not need to be re-evaluated / re-rendered.
     *
     * @param {Object[]} rawData
     * @return {RecordSet}
     */
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

    /**
     * Return a version of this RecordSet with a record (and all its children, if any) removed.
     *
     * @param {(string|number)} id - ID of record to be removed.
     * @return {RecordSet}
     */
    removeRecord(id) {
        const filter = (rec) => {
            if (rec.id == id) return false;
            const {parent} = rec;
            if (parent && !filter(parent)) return false;
            return true;
        };

        return this.applyFilter(filter);
    }

    /**
     * Return a version of this RecordSet with records added or updated. Existing records not
     * matched by ID to rows in the update dataset will be left in place.
     *
     * @param {Object[]} rawData - raw data for records to be added or updated.
     * @return {RecordSet}
     */
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
            `ID ${rec.id} is not unique. Use the 'LocalStore.idSpec' config to resolve a unique ID for each record.`
        );
        records.set(rec.id, rec);
        if (data.children) {
            data.children.forEach(rawChild => this.createRecord(rawChild, records, rec));
        }
    }

    toTree() {
        const childrenMap = new Map();

        // Pass 1, create nodes.
        const nodes = this.list.map(record => ({record})),
            [roots, nonRoots] = partition(nodes, (node) => node.record.parentId == null);

        // Pass 2, collect children by parent.
        nonRoots.forEach(node => {
            let {parentId} = node.record,
                children = childrenMap.get(parentId);
            if (!children) {
                children = [];
                childrenMap.set(parentId, children);
            }
            children.push(node);
        });

        // Pass 3, assign children.
        nodes.forEach(node => {
            node.children = childrenMap.get(node.record.id) || [];
        });

        return roots;
    }
}