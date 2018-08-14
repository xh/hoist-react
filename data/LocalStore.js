/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {LastPromiseModel} from '@xh/hoist/promise';
import {observable, action} from '@xh/hoist/mobx';
import {BaseStore} from './BaseStore';

/**
 * Basic implementation of Store for local in-memory data.
 */
export class LocalStore extends BaseStore {

    @observable.shallow _recordsMap = new Map();

    @observable.ref _allRecords = [];
    @observable.ref _records = [];

    _loadModel = new LastPromiseModel();
    _filter = null;

    processRawData = null;

    /**
     * @param {Object} c - LocalStore configuration.
     * @param {function} [c.processRawData] - Function to run on data presented to loadData() before
     *      creating records.
     * @param {function} [c.filter] - Filter function to be run on _allRecords to produce _records.
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
        return this.allRecords.length;
    }

    /**
     * Get the count of the filtered record in the store
     */
    get count() {
        return this.records.length;
    }

    //-----------------------------
    // Implementation of Store
    //-----------------------------
    get records()       {return this._records}
    get allRecords()    {return this._allRecords}
    get loadModel()     {return this._loadModel}
    get filter()        {return this._filter}
    setFilter(filterFn) {
        this._filter = filterFn;
        this.rebuildArrays();
    }

    getById(id, filteredOnly) {
        const rec = this._recordsMap.get(id);
        return (filteredOnly && rec && this._filter && !this.filter(rec)) ?
            null :
            rec;
    }

    //-----------------------------------
    // Protected methods for subclasses
    //-----------------------------------
    @action
    loadDataInternal(rawData) {
        this._recordsMap = this.createRecordMap(rawData);
        this.rebuildArrays();
    }

    @action
    updateRecordInternal(rec) {
        this._recordsMap.set(rec.id, rec);
        this.rebuildArrays();
    }

    @action
    deleteRecordInternal(rec) {
        this._recordsMap.delete(rec.id);
        this.rebuildArrays();
    }

    @action
    rebuildArrays() {
        const {_filter, _recordsMap} = this;
        this._allRecords = Array.from(_recordsMap.values());
        this._records = _filter ? this._allRecords.filter(_filter) : this._allRecords;
    }

    createRecordMap(rawData) {
        const {processRawData} = this;
        if (processRawData) {
            rawData = processRawData(rawData);
        }
        rawData.forEach((rec, id) => {
            if (!('id' in rec)) rec.id = id;
        });
        const ret = new Map();
        rawData.forEach(it => {
            const rec = this.createRecord(it);
            ret.set(rec.id, rec);
        });
        return ret;
    }

    destroy() {
        XH.safeDestroy(this._loadModel);
    }
}