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
 * Internal Recordset for Store.
 *
 * This is an immutable object.
 *
 * @private
 */
export class RecordSet {

    store;            // source store
    records;          // map of all records, by id

    _list;            // Lazy array of records
    _tree;            // Lazy array of root RecordNodes

    /**
     * @param {Store} store
     * @param {Map} [records]
     */
    constructor(store, records = new Map()) {
        this.records = records;
        this.store = store;
    }

    /** Number of records contained in this recordset */
    get count() {
        return this.records.length;
    }

    /** Return all records as a flat list */
    get list() {
        if (!this._list) {
            this._list = Array.from(this.records.values());
        }
        return this._list;
    }

    /** Return all records in a tree representation. */
    get tree() {
        if (!this._tree) {
            this._tree = this.toTree();
        }
        return this._tree;
    }

    /**
     * Return a filtered version of this recordset.
     *
     * @param {function} filter. If null, this method will return the recordset itself.
     * @return {RecordSet}
     */
    applyFilter(filter) {
        if (!filter) return this;

        const passes =  new Map(),
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
     * Load new rawData to replace existing records.
     * Re-use existing records if rawData is unchanged.
     *
     * @param {Object[]} rawData
     * @return {RecordSet}
     */
    loadData(rawData) {
        const {records} = this,
            newRecords = this.createRecords(rawData),
            newKeys = newRecords.keys();

        // Run through new records -- if equivalent to existing record, take existing instead.
        // This will allow downstream grids to more efficiently recognize non-changed records.
        for (var key of newKeys) {
            const currRec = records.get(key),
                newRec = newRecords.get(key);

            if (currRec && currRec.isEqual(newRec)) {
                newRecords.set(key, currRec);
            }
        }
        return new RecordSet(this.store, newRecords);
    }

    /**
     * Return a version of this recordset with a record removed.
     *
     * @param {string} id - id of record to be removed. All child rows of this record will also be removed.
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
     * Return a version of this recordset with additional records added or updated.
     *
     * @param {Object[]} rawData -  raw data for records to be added or updated.
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

    //-----------------------------------
    // Implementatation
    //-----------------------------------
    createRecords(rawData) {
        const ret = new Map();
        rawData.forEach(raw => this.createRecord(raw, ret, null));
        return ret;
    }

    createRecord(raw, records, parent) {
        const {store} = this,
            {idSpec} = store,
            idGen = isString(idSpec) ? r => r[idSpec] : idSpec;

        if (store.processRawData) store.processRawData(raw);

        raw.id = idGen(raw);
        throwIf(
            isNil(raw.id),
            "Record has a null/undefined ID. Use the 'LocalStore.idSpec' config to resolve a unique ID for each record."
        );
        throwIf(
            records.has(raw.id),
            `ID ${raw.id} is not unique. Use the 'LocalStore.idSpec' config to resolve a unique ID for each record.`
        );
        const rec = new Record({raw, parent, store});
        records.set(rec.id, rec);
        if (raw.children) {
            raw.children.forEach(rawChild => this.createRecord(rawChild, records, rec));
        }
    }

    toTree() {
        const childrenMap = new Map();

        // Pass 1, create nodes.
        const nodes = this.list.map(record => {return {record, children: []}}),
            [roots, nonRoots] = partition(nodes, (node) => node.record.parentId == null);

        // Pass 2, collect children by parent
        nonRoots.forEach(node => {
            let {parentId} = node.record,
                children = childrenMap.get(parentId);
            if (!children) {
                children = [];
                childrenMap.set(parentId, children);
            }
            children.push(node);
        });

        // Pass 3, assign children
        nodes.forEach(node => {
            node.children = childrenMap.get(node.record.id) || [];
        });

        return roots;
    }
}