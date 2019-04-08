/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {observable, action} from '@xh/hoist/mobx';
import {isString, isNil} from 'lodash';

import {RecordSet} from './impl/RecordSet';
import {Record} from './Record';
import {BaseStore} from './BaseStore';

/**
 * Basic implementation of Store for local in-memory data.
 */
export class LocalStore extends BaseStore {

    processRawData;
    idSpec;

    @observable.ref _dataLastUpdated;
    @observable.ref _all;
    @observable.ref _filtered;

    _filter = null;

    /**
     * @param {Object} c - LocalStore configuration.
     * @param {function} [c.processRawData] - Function to run on each individual data object
     *      presented to loadData() prior to creating a record from that raw object.
     * @param {(function|string)} [c.idSpec] - specification for selecting or producing an immutable
     *      unique id for each record. May be either a property (default is 'id') or a function to
     *      create an id from a record. If there is no natural id to select/generate, you can use
     *      `XH.genId` to generate a unique id on the fly. NOTE that in this case, grids and other
     *      components bound to this store will not be able to maintain record state across reloads.
     * @param {function} [c.filter] - Filter function to be run.
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
        this.setFilter(filter);
        this.idSpec = idSpec;
        this.processRawData = processRawData;
        this._filtered = this._all = new RecordSet({store: this});
        this._dataLastUpdated = new Date();
    }

    /**
     * Replace existing records with new records.
     *
     * @param {Object[]} rawRecords - raw records to be loaded into the store.
     */
    @action
    loadData(rawRecords) {
        this._all = this.all.loadData(rawRecords);
        this.rebuildFiltered();
        this._dataLastUpdated = new Date();
    }

    /**
     * Call when data contained in the records contained by this store have been exogenously updated.
     *
     * This method is used to signal that data properties within records have been changed.  If the structure of the
     * data has changed (e.g. deletion, additions, re-parenting of children) loadData() should be called instead.
     */
    @action
    noteDataUpdated() {
        this.rebuildFiltered();
        this._dataLastUpdated = new Date();
    }
    
    /**
     * Last time the underlying data in store was changed either via loadData(), or as
     * marked by noteDataUpdated().
     */
    get dataLastUpdated() {
        return this._dataLastUpdated;
    }

    //-----------------------------
    // Implementation of Store
    //-----------------------------
    get records()           {return this._filtered.list}
    get allRecords()        {return this._all.list}

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
        return rs.map.get(id);
    }

    //-----------------------------------
    // Protected methods for subclasses
    //-----------------------------------
    @action
    deleteRecordInternal(id) {
        this._all = this._all.removeRecord(id);
        this.rebuildFiltered();
    }

    @action
    updateRecordInternal(rawData) {
        this._all = this._all.updateRecord(rawData);
        this.rebuildFiltered();
    }

    //------------------------
    // Private Implementation
    //------------------------
    @action
    rebuildFiltered() {
        this._filtered = this._all.applyFilter(this.filter);
    }
}