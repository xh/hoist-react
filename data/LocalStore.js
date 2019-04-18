/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {observable, action} from '@xh/hoist/mobx';
import {RecordSet} from './impl/RecordSet';
import {BaseStore} from './BaseStore';

/**
 * Primary BaseStore implementation for local, in-memory data.
 */
export class LocalStore extends BaseStore {

    /** @member {function} */
    processRawData;
    /** @member {(function|string)} */
    idSpec;

    /** @member {Date} */
    @observable.ref _dataLastUpdated;
    /** @member {RecordSet} */
    @observable.ref _all;
    /** @member {RecordSet} */
    @observable.ref _filtered;

    _filter = null;

    /**
     * @param {Object} c - LocalStore configuration.
     * @param {function} [c.processRawData] - function to run on each individual data object
     *      presented to loadData() prior to creating a record from that raw object.
     * @param {(function|string)} [c.idSpec] - specification for selecting or producing an immutable
     *      unique id for each record. May be either a property (default is 'id') or a function to
     *      create an id from a record. If there is no natural id to select/generate, you can use
     *      `XH.genId` to generate a unique id on the fly. NOTE that in this case, grids and other
     *      components bound to this store will not be able to maintain record state across reloads.
     * @param {function} [c.filter] - filter function to be run.
     * @param {...*} [c.baseStoreArgs] - Additional properties to pass to BaseStore.
     */
    constructor(
        {
            processRawData = null,
            filter = null,
            idSpec = 'id',
            ...baseStoreArgs
        }) {
        super(baseStoreArgs);
        this._filtered = this._all = new RecordSet(this);
        this.setFilter(filter);
        this.idSpec = idSpec;
        this.processRawData = processRawData;
        this._dataLastUpdated = new Date();
    }

    /**
     * Load new data into this store, replacing any/all pre-existing rows.
     *
     * If raw data objects have a `children` property it will be expected to be an array
     * and its items will be recursively processed into child records.
     *
     * Note {@see RecordSet.loadData} regarding the re-use of existing Records for efficiency.
     *
     * @param {Object[]} rawData
     */
    @action
    loadData(rawData) {
        this._all = this._all.loadData(rawData);
        this.rebuildFiltered();
        this._dataLastUpdated = new Date();
    }

    /**
     * Add or update data in store. Existing records not matched by ID to rows in the update
     * dataset will be left in place.
     * @param {Object[]} rawData
     */
    @action
    updateData(rawData) {
        this._all = this._all.updateData(rawData);
        this.rebuildFiltered();
        this._dataLastUpdated = new Date();
    }

    /**
     * Remove a record (and all its children, if any) from the store.
     * @param {(string|number)} id - ID of the the record to be removed.
     */
    @action
    removeRecord(id) {
        this._all = this._all.removeRecord(id);
        this.rebuildFiltered();
        this._dataLastUpdated = new Date();
    }

    /**
     * Call if/when any records have had their data modified directly, outside of this store's load
     * and update APIs.
     *
     * If the structure of the data has changed (e.g. deletion, additions, re-parenting of children)
     * loadData() should be called instead.
     */
    @action
    noteDataUpdated() {
        this.rebuildFiltered();
        this._dataLastUpdated = new Date();
    }
    
    /**
     * The last time this store's data was changed via loadData() or as marked by noteDataUpdated().
     */
    get dataLastUpdated() {
        return this._dataLastUpdated;
    }

    //-----------------------------
    // Implementation of Store
    //-----------------------------
    get records()           {return this._filtered.list}
    get allRecords()        {return this._all.list}
    get recordsAsTree()     {return this._filtered.tree}
    get allRecordsAsTree()  {return this._all.tree}

    get filter()            {return this._filter}
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
        return rs.records.get(id);
    }
    
    //------------------------
    // Private Implementation
    //------------------------
    @action
    rebuildFiltered() {
        this._filtered = this._all.applyFilter(this.filter);
    }
}