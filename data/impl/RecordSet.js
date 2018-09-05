/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {without, isEmpty, findIndex, clone} from 'lodash';

/**
 * Internal Recordset for Store.
 *
 * This is an immutable object.
 *
 * @private
 */
export class RecordSet {

    map;   // Map of all records, by id
    list;  // Ordered list of records at root

    /**
     * @param {Record[]} ordered list of records to be included.
     */
    constructor(records) {
        this.list = records;
        this.map = this.mapRecords(records);
    }

    /** Number of records contained in this record set */
    get count() {
        return this.map.size;
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
        const newRecords = this.list.map(r => r.applyFilter(filter));
        return new RecordSet(without(newRecords, null));
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
        return new RecordSet([...this.list, record]);
    }

    /**
     * Return a version of this recordset with a record replaced.
     *
     * NOTE:  Currently only replacing a record at the root is supported
     *
     * @param {Record} record
     */
    updateRecord(oldRecord, newRecord) {
        const newList = clone(this.list),
            index = findIndex(newList, {id: oldRecord.id});

        if (index < 0) throw XH.exception(`Cannot find Record to update: id = ${oldRecord.id}`)

        newRecord.children = oldRecord.children;
        newList[index] = newRecord;

        return new RecordSet(newList);
    }

    //------------------
    // Implementation
    // ------------------
    mapRecords(records, map = new Map()) {
        records.forEach(r => {
            map.set(r.id, r);
            if (isEmpty(r.children)) {
                this.mapRecords(r.children, map);
            }
        });
        return map;
    }
}