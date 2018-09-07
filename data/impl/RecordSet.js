/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {without, isEmpty, findIndex, clone} from 'lodash';

/**
 * Internal Recordset for Store.
 *
 * This is an immutable object.
 *
 * @private
 */
export class RecordSet {

    roots;        // List of records at root, in order as presented to store
    list;         // List of *all* records, in "infix" order
    map;          // map of all records, by id

    /**
     * @param {Record[]} rootRecords -  ordered list of root records to be included.
     */
    constructor(rootRecords) {
        this.roots = rootRecords;

        // TODO: Make list, map lazy and/or remove altogether.
        const {list, map} = this.gatherAllRecords(rootRecords);
        this.list = list;
        this.map = map;
    }

    /** Number of records contained in this record set */
    get count() {
        return this.list.length;
    }

    /**
     * Return a filtered version of this RecordSet.
     *
     * @param {function} filter. If null, this method will return
     *      the recordset itself.
     *
     * @return {RecordSet}
     */
    applyFilter(filter) {
        if (!filter) return this;
        const newRoots = this.roots.map(r => r.applyFilter(filter));
        return new RecordSet(without(newRoots, null));
    }

    /**
     * Return a version of this recordset with a child removed.
     *
     * @param {Record} record to be removed.
     *
     * @return {Record}
     */
    removeRecord(record) {
        return this.applyFilter(r => r.id !== record.id);
    }

    /**
     * Return a version of this recordset with a child added.
     *
     * NOTE:  Currently only adding a record at the root is the supported
     *
     * @param {Record} record
     */
    addRecord(record) {
        return new RecordSet([...this.roots, record]);
    }

    /**
     * Return a version of this recordset with a record replaced.
     *
     * NOTE:  Currently only replacing a record at the root is supported
     *
     * @param {Record} record
     */
    updateRecord(oldRecord, newRecord) {
        const newRoots = clone(this.roots),
            index = findIndex(newRoots, {id: oldRecord.id});

        if (index < 0) throw XH.exception(`Cannot find Record to update: id = ${oldRecord.id}`);

        newRecord.children = oldRecord.children;
        newRoots[index] = newRecord;

        return new RecordSet(newRoots);
    }

    //------------------
    // Implementation
    // ------------------
    gatherAllRecords(records, list = [], map = new Map()) {
        records.forEach(r => {
            list.push(r);
            map.set(r.id, r);
            if (!isEmpty(r.children)) {
                this.gatherAllRecords(r.children, list, map);
            }
        });
        return {list, map};
    }
}