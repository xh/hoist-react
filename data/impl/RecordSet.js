/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {without, isEmpty, findIndex, clone, isString, isNil} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js/';
import {Record} from "@xh/hoist/data/Record";

/**
 * Internal Recordset for Store.
 *
 * This is an immutable object.
 *
 * @private
 */
export class RecordSet {

    store;

    records;          // map of all records, by id

    /**
     * @param {Map} records - collection of records to be included.
     *      if Map, this object will be used directly by this object for internal
     *      storage.
     *
     * @param {Store} store
     * @param {Map} [records]
     */
    constructor({records = new Map(), store}) {
        this.records = records;
        this.store = store;
    }

    /** Number of records contained in this recordset */
    get count() {
        return this.records.length;
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
            records = {this};

        // A record that passes the filter also recursively passes all its parents.
        const markPass = (rec) => {
            if (passses.has(rec.id)) return;
            passes.set(rec.id) = rec;
            const parent = this.getParent(record);
            if (parent) markPass(parent);
        };

        records.forEach(rec => {
            if (filter(rec)) markPass(rec);
        });

        return new RecordSet({records: passes, store: this.store});
    }

    /**
     * Load new rawData to replace existing records.
     * Re-use existing records if rawData is unchanged.
     *
     * @param {Object[]} rawData
     * @return {RecordSet}
     */
    loadData(rawData) {
        const newRecords = createRecords({rawData, store: this.store});
        if ()



            

    }

    /**
     * Return a version of this recordset with a record removed.
     *
     * @param {string} id - id to be removed.
     * @return {RecordSet}
     */
    removeRecord(id) {
        const filter = (rec) => {
            if (rec.id == id) return false;
            const parent = this.getParent(rec);
            if (parent && !filter(parent)) return false;
            return true;
        }

        return this.applyFilter(filter);
    }

    /**
     * Return a version of this recordset with additional records added or updated.
     *
     * @param {Object[]} rawData -  raw data for records to be added or updated.
     * @return {RecordSet}
     */
    updateData(rawData) {

    }


    //-----------------------------------
    // Implementatation
    //-----------------------------------
    createRecords({rawData, createdRecords = {}, parent = null}) {
        rawData.forEach(raw => this.createRecord(raw, createdRecords, parent));
        return createdRecords;
    }

    createRecord(raw, createdRecords, parent = null) {
        const {idSpec} = this;
        const idGen = isString(idSpec) ? r => r[idSpec] : idSpec;

        if (this.store.processRawData) this.store.processRawData(raw);

        raw.id = idGen(raw);
        throwIf(
            isNil(raw.id),
            "Record has a null/undefined ID. Use the 'LocalStore.idSpec' config to resolve a unique ID for each record."
        );
        throwIf(
            createdRecords.has(raw.id),
            `ID ${raw.id} is not unique. Use the 'LocalStore.idSpec' config to resolve a unique ID for each record.`
        )
        const rec = new Record({raw, parent, fields: this.store.fields});
        createdRecords.set(rec.id, rec);
        this.createRecords(raw.children, createdRecords, rec);
    }
    
    //------------------
    // Implementation
    // ------------------
    getParent(rec) {
        return rec.parentId != null ? this.records[rec.parentId] : null;
    }
}