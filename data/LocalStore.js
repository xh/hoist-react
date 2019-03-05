/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
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
    @observable.ref _all = new RecordSet([]);
    @observable.ref _filtered = this._all;

    _filter = null;

    /**
     * @param {Object} c - LocalStore configuration.
     * @param {function} [c.processRawData] - Function to run on data
     *      presented to loadData() before creating records.
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
        this._dataLastUpdated = new Date();
    }

    /**
     * Replace existing records with new records.
     *
     * @param {Object[]} rawRecords - raw records to be loaded into the store.
     */
    @action
    loadData(rawRecords) {
        this._all = new RecordSet(this.createRecords(rawRecords));
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
    get rootRecords()       {return this._filtered.roots}
    get allRootRecords()    {return this._all.roots}

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
    createRecords(rawData, parent = null) {
        const {idSpec} = this;
        const idGen = isString(idSpec) ? r => r[idSpec] : idSpec;

        return rawData.map(raw => {
            if (this.processRawData) this.processRawData(raw);

            raw.id = idGen(raw);
            throwIf(
                isNil(raw.id),
                "Cannot load record with a null/undefined ID. Use the 'LocalStore.idSpec' config to resolve a unique ID for each record."
            );

            const rec = new Record({raw, parent, fields: this.fields});
            rec.children = raw.children ? this.createRecords(raw.children, rec) : [];
            return rec;
        });
    }

    @action
    rebuildFiltered() {
        this._filtered = this._all.applyFilter(this.filter);
    }
}