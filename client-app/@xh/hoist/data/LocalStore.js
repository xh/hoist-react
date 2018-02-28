/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {start, LastPromiseModel, remove} from 'hoist/promise';
import {observable, action, computed} from 'hoist/mobx';

import {BaseStore} from './BaseStore';

/**
 * Basic implementation of Store.
 *
 * This class allows records to be loaded via a loadDataAsync() method.
 */
export class LocalStore extends BaseStore {

    @observable.shallow _allRecords = [];
    @observable.shallow _records = [];

    _loadModel = new LastPromiseModel();
    _filter = null;

    processRawData = null;

    /**
     * Construct this object.
     *
     * @param processRawData, optional.  Function to run on data presented to
     *        loadDataAsync() before creating records.
     */
    constructor({processRawData = null, ...rest}) {
        super(rest);
        this.processRawData = processRawData;
    }

    /**
     * Replace existing records with new records.
     *
     * @param rawData, array of raw records to be loaded into the store.
     */
    async loadDataAsync(rawData) {
        return start(
            () => this.loadDataInternal(rawData)
        ).linkTo(
            this.loadModel
        )
    }

    //---------------------------------
    // Protected Methods for subclasses
    //---------------------------------
    @action
    loadDataInternal(rawData) {
        this._allRecords = this.createRecords(rawData);
        this.applyFilter();
    }

    createRecords(rawData) {
        const id = 0;
        const {processRawData, recordSpec} = this;
        if (processRawData) {
            rawData = processRawData(rawData);
        }
        rawData.forEach((rec, id) => {
            if (!('id' in rec)) rec.id = id;
        });
        return rawData.map(it => recordSpec.createRecord(it));
    }

    //-----------------------------
    // Implementation of Store
    //-----------------------------
    get records()       {return this._records;}
    get allRecords()    {return this._allRecords;}

    get loadModel()     {return this._loadModel;}
    get filter()        {return this._filter;}
    set filter(filterFn) {
        this._filter = filterFn;
        this.applyFilter();
    }

    applyFilter() {
        const {_filter, _allRecords} = this;
        this._records = _filter ? _allRecords.filter(_filter) : _allRecords;
    }
}