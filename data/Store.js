/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {observable, action} from '@xh/hoist/mobx';
import {RecordSet} from './impl/RecordSet';
import {Field} from './Field';
import {partition, isString, castArray, isEmpty, isFunction, isPlainObject} from 'lodash';
import {throwIf} from '@xh/hoist/utils/js';
import {Record} from './Record';
import {StoreFilter} from './StoreFilter';

/**
 * A managed and observable set of local, in-memory records.
 */
export class Store {

    /** @member {Field[]} */
    fields = null;
    /** @member {(function|string)} */
    idSpec;
    /** @member {function} */
    processRawData;

    /**
     * @member {number} - timestamp (ms) of the last time this store's data was changed via
     *      loadData() or as marked by noteDataUpdated().
     */
    @observable lastUpdated;

    /** @member {Record} - record containing summary data. */
    @observable.ref summaryRecord = null;

    @observable.ref _all;
    @observable.ref _filtered;
    _filter = null;
    _loadRootAsSummary = false;

    /**
     * @param {Object} c - Store configuration.
     * @param {(string[]|Object[]|Field[])} c.fields - Fields, Field names, or Field config objects.
     * @param {(function|string)} [c.idSpec] - specification for selecting or producing an immutable
     *      unique id for each record. May be either a property (default is 'id') or a function to
     *      create an id from a record. If there is no natural id to select/generate, you can use
     *      `XH.genId` to generate a unique id on the fly. NOTE that in this case, grids and other
     *      components bound to this store will not be able to maintain record state across reloads.
     * @param {function} [c.processRawData] - function to run on each individual data object
     *      presented to loadData() prior to creating a record from that object.  This function should
     *      return a data object, taking care to clone the original object if edits are necessary.
     * @param {(StoreFilter|Object|function)} [c.filter] - initial filter for records, or specification for creating one.
     * @param {boolean} [c.loadRootAsSummary] - true to treat the root node in hierarchical data as
     *      the summary record.
     */
    constructor(
        {
            fields,
            idSpec = 'id',
            processRawData = null,
            filter = null,
            loadRootAsSummary = false
        }) {
        this.fields = this.parseFields(fields);
        this._filtered = this._all = new RecordSet(this);
        this.setFilter(filter);
        this.idSpec = idSpec;
        this.processRawData = processRawData;
        this.lastUpdated = Date.now();
        this._loadRootAsSummary = loadRootAsSummary;
    }

    /**
     * Load new data into this store, replacing any/all pre-existing records.
     *
     * If raw data objects have a `children` property it will be expected to be an array
     * and its items will be recursively processed into child records.
     *
     * Note that this process will re-use pre-existing Records if they are present in the new
     * dataset (as identified by their ID), contain the same data, and occupy the same place in any
     * hierarchy across old and new loads.
     *
     * This is to maximize the ability of downstream consumers (e.g. ag-Grid) to recognize Records
     * that have not changed and do not need to be re-evaluated / re-rendered.
     *
     * Summary data can be provided via `rawSummaryData` or as the root data if the Store was
     * created with the loadRootAsSummary flag set to true.
     *
     * @param {Object[]} rawData
     * @param {Object} [rawSummaryData]
     */
    @action
    loadData(rawData, rawSummaryData) {
        throwIf(this._loadRootAsSummary && rawSummaryData,
            'Cannot provide rawSummaryData to loadData when loadRootAsSummary is true.'
        );

        const rootSummary = this.getRootSummary(rawData);
        if (rootSummary) {
            rawData = rootSummary.children;
            rawSummaryData = {...rootSummary, children: null};
        }

        this._all = this._all.loadData(rawData);
        this.rebuildFiltered();

        this.summaryRecord = rawSummaryData ? this.createSummaryRecord(rawSummaryData) : null;

        this.lastUpdated = Date.now();
    }

    /**
     * Add or update data in store. Existing sibling or ancestor records not matched by ID to rows
     * in the update dataset will be left in place.
     *
     * When updating hierarchical data the entire branch will be updated with the provided data. Any
     * children not included in the data will be removed from the store.
     *
     * Updated summary data can be provided via `rawSummaryData` or as the root data if the Store was
     * created with the loadRootAsSummary flag set to true.
     *
     * @param {Object[]} rawData
     * @param {Object} [rawSummaryData]
     */
    @action
    updateData(rawData, rawSummaryData = null) {
        throwIf(this._loadRootAsSummary && rawSummaryData,
            'Cannot provide rawSummaryData to updateData when loadRootAsSummary is true.'
        );

        let didUpdate = false;
        if (!isEmpty(rawData)) {
            const oldSummary = this.summaryRecord,
                newSummary = this.getRootSummary(rawData);
            if (oldSummary && newSummary && oldSummary.id === this.buildRecordId(newSummary)) {
                rawData = newSummary.children;
                rawSummaryData = {...newSummary, children: null};
            }

            this._all = this._all.updateData(rawData);
            this.rebuildFiltered();
            didUpdate = true;
        }

        if (rawSummaryData) {
            this.summaryRecord = this.createSummaryRecord(rawSummaryData);
            didUpdate = true;
        }

        if (didUpdate) this.lastUpdated = Date.now();
    }

    /**
     * Update changes to record data, without adjusting tree structure.
     *
     * @param updates
     */
    updateRecords(updates) {
        let recordUpdates = null,
            summaryUpdate = null,
            didUpdate = false;

        if (this._loadRootAsSummary && this.summaryRecord) {
            [recordUpdates, summaryUpdate] = partition(updates, (record) => record.id == this.summaryRecord.id);
        }
        
        if (!isEmpty(summaryUpdate)) {
            this._all = this._all.updateRecords(recordUpdates);
            this.rebuildFiltered();
            didUpdate = true;
        }

        if (summaryUpdate) {
            this.summaryRecord = this.createSummaryRecord(summaryUpdate);
            didUpdate = true;
        }

        if (didUpdate) this.lastUpdated = Date.now();
    }


    /**
     * Add data to the store.
     *
     * @param {Object[]} rawData
     * @param {Record} parentRecord
     */
    @action
    addData(rawData, parentRecord) {
        this._all = this._all.addData(rawData, parentRecord ? parentRecord.id : null);
        this.rebuildFiltered();
        this.lastUpdated = Date.now();
    }

    /** Remove all records from the store. */
    clear() {
        this.loadData([], null);
    }

    /**
     * Remove a record (and all its children, if any) from the store.
     * @param {(string[]|number[])} ids - IDs of the records to be removed.
     */
    @action
    removeRecords(ids) {
        ids = castArray(ids);
        this._all = this._all.removeRecords(ids);
        this.rebuildFiltered();
        this.lastUpdated = Date.now();
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
        this.lastUpdated = Date.now();
    }

    /**
     * Get a specific field, by name.
     * @param {string} name - field name to locate.
     * @return {Field}
     */
    getField(name) {
        return this.fields.find(it => it.name === name);
    }

    /**
     * Records in this store, respecting any filter (if applied).
     * @return {Record[]}
     */
    get records() {
        return this._filtered.list;
    }

    /**
     * All records in this store, unfiltered.
     * @return {Record[]}
     */
    get allRecords() {
        return this._all.list;
    }

    /**
     * Root records in this store, respecting any filter (if applied).
     * If this store is not hierarchical, this will be identical to 'records'.
     *
     * @return {Record[]}
     */
    get rootRecords() {
        return this._filtered.rootList;
    }

    /**
     * Root records in this store, unfiltered.
     * If this store is not hierarchical, this will be identical to 'allRecords'.
     *
     * @return {Record[]}
     */
    get allRootRecords() {
        return this._all.rootList;
    }

    /**
     * Set filter to be applied.
     * @param {(StoreFilter|Object|function)} filter - StoreFilter to be applied to records, or
     *      config or function to be used to create one.
     */
    setFilter(filter) {
        if (isFunction(filter)) {
            filter = new StoreFilter({fn: filter});
        } else if (isPlainObject(filter)) {
            filter = new StoreFilter(filter);
        }

        this._filter = filter;
        this.rebuildFiltered();
    }

    /** @returns {StoreFilter} - the current filter (if any) applied to the store. */
    get filter() {return this._filter}

    /** Get the count of all records loaded into the store. */
    get allCount() {
        return this._all.count;
    }

    /** Get the count of the filtered records in the store. */
    get count() {
        return this._filtered.count;
    }

    /** Get the count of the filtered root records in the store. */
    get rootCount() {
        return this._filtered.rootCount;
    }

    /** Get the count of all root records in the store. */
    get allRootCount() {
        return this._all.rootCount;
    }

    /** Is the store empty after filters have been applied? */
    get empty() {return this.count === 0}

    /** Is this store empty before filters have been applied? */
    get allEmpty() {return this.allCount === 0}

    /**
     * Get a record by ID, or null if no matching record found.
     *
     * @param {(string|number)} id
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     * @return {Record}
     */
    getById(id, fromFiltered = false) {
        const rs = fromFiltered ? this._filtered : this._all;
        return rs.records.get(id);
    }

    /**
     * Get children records for a record.
     *
     * See also the 'children' and 'allChildren' properties on Record - those getters will likely
     * be more convenient for most app-level callers.
     *
     * @param {(string|number)} id - id of record to be queried.
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     * @return {Record[]}
     */
    getChildrenById(id, fromFiltered = false) {
        const rs = fromFiltered ? this._filtered : this._all,
            ret = rs.childrenMap.get(id);
        return ret ? ret : [];
    }

    /**
     * Creates a Record from raw data.
     *
     * @param {Object} raw - raw data to create the record from
     * @param {Record} [parent] - parent of this record
     * @return {Record}
     */
    createRecord(raw, parent) {
        const {processRawData} = this;

        let data = raw;
        if (processRawData) {
            data = processRawData(raw);
            throwIf(!data,
                'processRawData should return an object. If writing/editing, be sure to return a clone!');
        }

        return new Record({data, raw, parent, store: this});
    }

    /**
     * Builds a Record id given record data that has been processed by processRawData
     *
     * @param {Object} data
     * @returns {*}
     */
    buildRecordId(data) {
        const {idSpec} = this;
        return isString(idSpec) ? data[idSpec] : idSpec(data);
    }

    /** Destroy this store, cleaning up any resources used. */
    destroy() {}

    //--------------------
    // For Implementations
    //--------------------
    get defaultFieldClass() {
        return Field;
    }

    //------------------------
    // Private Implementation
    //------------------------
    @action
    rebuildFiltered() {
        this._filtered = this._all.applyFilter(this.filter);
    }

    parseFields(fields) {
        const ret = fields.map(f => {
            if (f instanceof Field) return f;
            if (isString(f)) f = {name: f};
            return new this.defaultFieldClass(f);
        });

        throwIf(
            ret.some(it => it.name == 'id'),
            `Applications should not specify a field for the id of a record.  An id property is created 
            automatically for all records. See Store.idSpec for more info.`
        );
        return ret;
    }

    getRootSummary(rawData) {
        return this._loadRootAsSummary && rawData.length === 1 && !isEmpty(rawData[0].children) ?
            rawData[0] :
            null;
    }

    createSummaryRecord(rawData) {
        const rec = this.createRecord(rawData);
        rec.xhIsSummary = true;
        return rec;
    }
}


