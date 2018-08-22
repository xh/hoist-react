/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {observable, action} from '@xh/hoist/mobx';
import {BaseStore} from './BaseStore';

/**
 * Basic implementation of Store for local in-memory data.
 */
export class LocalStore extends BaseStore {

    @observable.ref _allRecords;
    @observable.ref _filteredRecords;

    _loadModel = new PendingTaskModel();
    _filter = null;

    processRawData = null;

    /**
     * @param {Object} c - LocalStore configuration.
     * @param {function} [c.processRawData] - Function to run on data presented to loadData() before
     *      creating records.
     * @param {function} [c.filter] - Filter function to be run.
     * @param {...*} [c.baseStoreArgs] - Additional properties to pass to BaseStore.
     */
    constructor({processRawData = null, filter, ...baseStoreArgs}) {
        super(baseStoreArgs);
        this.setFilter(filter);
        this.processRawData = processRawData;
    }

    /**
     * Replace existing records with new records.
     * @param {Object[]} rawData - raw records to be loaded into the store.
     */
    loadData(rawData) {
        this.loadDataInternal(rawData);
    }

    /**
     * Get the count of all records loaded into the store
     */
    get allCount() {
        return this._allRecords.count();
    }

    /**
     * Get the count of the filtered record in the store
     */
    get count() {
        return this._filteredRecords.count();
    }

    //-----------------------------
    // Implementation of Store
    //-----------------------------
    get records()       {return this._filteredRecords.list}
    get allRecords()    {return this._allRecords.list}
    get loadModel()     {return this._loadModel}
    get filter()        {return this._filter}
    setFilter(filterFn) {
        this._filter = filterFn;
        this.rebuildArrays();
    }

    getById(id, fromFiltered = false) {
        const map = fromFilter ? this._filteredRecords.map : this._allRecords.map;
        return map.get(id);
    }

    //-----------------------------------
    // Protected methods for subclasses
    //-----------------------------------
    @action
    loadDataInternal(rawData) {
        this.createRecords(rawData);
        this.rebuildFilteredRecords();
    }

    @action
    deleteRecordInternal(rec) {
        this.removeRecord(rec);
        const parent = rec.parent;
        if (parent) {
            parent = parent.removeChild(rec);
            this._fullMap.set(parent.id, parent);
        }
        this.rebuildFilter();
    }

    //------------------------
    // Private Implementation
    //------------------------
    createRecords(rawData) {
        const recs = this.createRecordsRecursive(rawData);
        return new RecordSet(recs);
    }

    createRecordsRecursive(rawData, idGenerator = {id: 0}) {
        return rawData.map(raw => {
            if (this.processRawData) this.processRawData(raw);
            if (!('id' in raw)) raw.id = idGenerator.id++;
            const children = raw.children ? this.createRecords(raw.children, idGenerator) : [];
            const rec = new Record({raw, field: this.fields, children});
            children.forEach(c => c.parent = rec);
            return rec;
        });
    }


    rebuildFilteredRecords() {
        const {filter} = this;
        if (!filter) {
            this._filteredRecords = this._allRecords;
        } else {
            const recs = [];
            this.records.forEach(child => {
                child = child.applyFilter(filter);
                if (child) recs.push(child);
            });
            this._filteredRecords = new RecordSet(recs);
        }
    }

    destroy() {
        XH.safeDestroy(this._loadModel);
    }
}