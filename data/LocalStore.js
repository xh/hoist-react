/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {throwIf} from '@xh/hoist/utils/js';
import {observable, action} from '@xh/hoist/mobx';
import {isString, isNil, partition} from 'lodash';

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
        this._filtered = this._all = new RecordSet(this);
        this.setFilter(filter);
        this.idSpec = idSpec;
        this.processRawData = processRawData;
        this._dataLastUpdated = new Date();
    }

    /**
     * Replace existing data in store with new data set.
     *
     * @param {Object[]} rawData - raw records to be loaded into the store.
     * All existing data will be replaced.
     *
     * Note that this object will seek to preserve object references for records that
     * have not been changed.  This is designed to maximize the ability of downstream
     * components (e.g. grids) to recognize records that have not been changed and do
     * not need to be updated.
     */
    @action
    loadData(rawData) {
        this._all = this._all.loadData(rawData);
        this.rebuildFiltered();
        this._dataLastUpdated = new Date();
    }

    /**
     * Add/edit data in store.
     *
     * @param {Object[]} rawData - raw records to be added/edited the store.
     */
    @action
    updateData(rawData) {
        this._all = this._all.updateData(rawData);
        this.rebuildFiltered();
    }

    /**
     * Remove record from the store.
     *
     * @param {string} id - id of the the record to be removed.
     */
    @action
    removeRecord(id) {
        this._all = this._all.removeRecord(id);
        this.rebuildFiltered();
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
        return rs.records.get(id);
    }


    /**
     * Get a flat set of records representing a store in a tree representations
     *
     * @param {Record[]} - records
     *
     * @returns {[]} -- array of records of form {record, children};
     */
    static getRecordsAsTree(records) {
        const childrenMap = new Map();

        // Pass 1, create nodes.
        const nodes = records.map(record => {return {record, children: []}}),
            [roots, nonRoots] = partition(nodes, (node) => node.record.parentId == null);

        // Pass 2, collect children by parent
        nonRoots.forEach(node => {
            let {parentId} = node.record,
                children = childrenMap.get(parentId);
            if (!children) {
                children = [];
                childrenMap.set(parentId, children);
            }
            children.push(node);
        });

        // Pass 3, assign children
        nodes.forEach(node => {
            node.children = childrenMap.get(node.record.id) || [];
        });

        return roots;
    }

    //------------------------
    // Private Implementation
    //------------------------
    @action
    rebuildFiltered() {
        this._filtered = this._all.applyFilter(this.filter);
    }




}