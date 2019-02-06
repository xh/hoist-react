/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {without, isEmpty, findIndex, clone} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js/';

/**
 * Internal Recordset for Store.
 *
 * This is an immutable object.
 *
 * @private
 */
export class RecordSet {

    roots;        // List of records at root, in order as presented to store
    list;         // List of all records, in "infix" order
    map;          // map of all records, by id

    /**
     * @param {Record[]} rootRecords -  ordered list of root records to be included. This array
     *      will be used and modified by this object and should not be re-used.
     */
    constructor(rootRecords) {
        this.roots = rootRecords;

        const {list, map} = this.gatherAllRecords(rootRecords);

        throwIf(
            list.length != map.size,
            'Store records cannot contain non-unique IDs.'
        );

        this.list = (rootRecords.length == map.size ? rootRecords : list);  // Avoid holding two copies of same list.
        this.map = map;
    }

    /** Number of records contained in this recordset */
    get count() {
        return this.list.length;
    }

    /**
     * Return a filtered version of this recordset.
     *
     * @param {function} filter. If null, this method will return the recordset itself.
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
     * @return {RecordSet}
     */
    removeRecord(record) {
        return this.applyFilter(r => r.id !== record.id);
    }

    /**
     * Return a version of this recordset with a child added.
     * NOTE: Currently adding a record at the root is the only supported operation.
     *
     * @param {Record} record to be added.
     * @return {RecordSet}
     */
    addRecord(record) {
        return new RecordSet([...this.roots, record]);
    }

    /**
     * Return a version of this recordset with a record replaced.
     * NOTE: Currently replacing a record at the root is the only supported operation.
     *
     * @param {Record} oldRecord
     * @param {Record} newRecord
     * @return {RecordSet}
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