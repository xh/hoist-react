/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {observable, action} from '@xh/hoist/mobx';
import {findIndex, clone} from 'lodash';

import {RecordSet} from './impl/RecordSet';
import {Record} from './Record';
import {BaseStore} from './BaseStore';

/**
 * Basic implementation of Store for local in-memory data.
 */
export class LocalStore extends BaseStore {

    processRawData = null;

    @observable.ref _all = new RecordSet([]);
    @observable.ref _filtered = this._all;

    _rawRecords = [];
    _loadModel = new PendingTaskModel();
    _filter = null;

    /**
     * @param {Object} c - LocalStore configuration.
     * @param {function} [c.processRawData] - Function to run on data
     *      presented to loadData() before creating records.
     * @param {function} [c.filter] - Filter function to be run.
     * @param {...*} [c.baseStoreArgs] - Additional properties to pass to BaseStore.
     */
    constructor({processRawData = null, filter = null, ...baseStoreArgs}) {
        super(baseStoreArgs);
        this.setFilter(filter);
        this.processRawData = processRawData;
    }

    /**
     * Replace existing records with new records.
     *
     * @param {Object[]} rawRecords - raw records to be loaded into the store.
     */
    @action
    loadData(rawRecords) {
        this._rawRecords = clone(rawRecords);
        this._all = new RecordSet(this.createRecords(this._rawRecords));
        this.rebuildFiltered();
    }


    //-----------------------------
    // Implementation of Store
    //-----------------------------
    get records()       {return this._filtered.list}
    get allRecords()    {return this._all.list}
    get loadModel()     {return this._loadModel}
    get filter()        {return this._filter}
    setFilter(filterFn) {
        this._filter = filterFn;
        this.rebuildFiltered();
    }

    get allCount() {
        return this._all.count;
    }

    get count() {
        return this._filtered.count;
    }

    getById(id, fromFiltered = false) {
        const rs = fromFiltered ? this._filtered : this._all;
        return rs.map.get(id);
    }

    //-----------------------------------
    // Protected methods for subclasses
    //-----------------------------------
    @action
    deleteRecordInternal(rec) {
        this._all = this._all.removeRecord(rec);
        this.rebuildFiltered();
    }

    @action
    updateRecordInternal(oldRec, newRec) {
        this._all = this._all.updateRecord(oldRec, newRec);
        this.rebuildFiltered();
    }

    @action
    addRecordInternal(rec) {
        this._all = this._all.addRecord(rec);
        this.rebuildFiltered();
    }

    //------------------------
    // Private Implementation
    //------------------------
    createRecords(rawData, parent = null, idGenerator = {id: 0}) {
        return rawData.map(raw => {
            if (this.processRawData) this.processRawData(raw);
            if (!('id' in raw)) raw.id = idGenerator.id++;
            const rec = new Record({raw, parent, fields: this.fields});
            rec.children = raw.children ? this.createRecords(raw.children, rec, idGenerator) : [];
            return rec;
        });
    }

    @action
    rebuildFiltered() {
        this._filtered = this._all.applyFilter(this.filter);
    }

    destroy() {
        XH.safeDestroy(this._loadModel);
    }
}