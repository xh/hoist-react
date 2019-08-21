/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {action, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isEmpty, isFunction, isPlainObject, isString, remove as lodashRemove} from 'lodash';
import {Field} from './Field';
import {RecordSet} from './impl/RecordSet';
import {Record} from './Record';
import {StoreFilter} from './StoreFilter';

/**
 * A managed and observable set of local, in-memory records.
 */
export class Store {

    /** @member {Field[]} */
    fields = null;
    /** @member {function} */
    idSpec;
    /** @member {function} */
    processRawData;

    /** @member {number} - timestamp (ms) of the last time this store's data was changed */
    @observable lastUpdated;

    /** @member {number} - timestamp (ms) of the last time this store's data was loaded.*/
    @observable lastLoaded;

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
     *      unique id for each record. May be either a string property name (default is 'id') or a
     *      function to create an id from a record. Will be normalized to a function upon Store
     *      construction. If there is no natural id to select/generate, you can use `XH.genId` to
     *      generate a unique id on the fly. NOTE that in this case, grids and other components
     *      bound to this store will not be able to maintain record state across reloads.
     * @param {function} [c.processRawData] - function to run on each individual data object
     *      presented to loadData() prior to creating a Record from that object. This function
     *      must return an object, cloning the original object if edits are necessary.
     * @param {(StoreFilter|Object|function)} [c.filter] - initial filter for Records, or a
     *      StoreFilter config to create.
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
        this.idSpec = isString(idSpec) ? (rec) => rec[idSpec] : idSpec;
        this.processRawData = processRawData;
        this.lastLoaded = this.lastUpdated = Date.now();
        this._loadRootAsSummary = loadRootAsSummary;
    }

    /**
     * Load a new and complete dataset, replacing any/all pre-existing Records as needed.
     *
     * If raw data objects have a `children` property, it will be expected to be an array and its
     * items will be recursively processed into child records, each created with a pointer to its
     * parent's newly assigned Record ID.
     *
     * Note that this process will re-use pre-existing Record object instances if they are present
     * in the new dataset (as identified by their ID), contain the same data, and occupy the same
     * place in any hierarchy across old and new loads.
     *
     * This is to maximize the ability of downstream consumers (e.g. ag-Grid) to recognize Records
     * that have not changed and do not need to be re-evaluated / re-rendered.
     *
     * Summary data can be provided via `rawSummaryData` or as the root data if the Store was
     * created with its `loadRootAsSummary` flag set to true.
     *
     * @param {Object[]} rawData
     * @param {Object} [rawSummaryData]
     */
    @action
    loadData(rawData, rawSummaryData) {

        // Peel off rootSummary if needed
        if (this._loadRootAsSummary) {
            throwIf(
                rawData.length != 1 || isEmpty(rawData[0].children) || rawSummaryData,
                'Incorrect call to loadData with loadRootAsSummary=true.  Summary Data should be in a single root node.'
            );
            rawSummaryData = rawData[0];
            rawData = rawData[0].children;
        }

        const recordMap = this.createRecords(rawData, null);
        this._all = this._all.loadRecords(recordMap);
        this.rebuildFiltered();
        this.setSummaryRecordInternal(rawSummaryData ? this.createRecord(rawSummaryData) : null);
        this.lastLoaded = this.lastUpdated = Date.now();
    }

    /**
     * Add, update, or delete records in this store.
     * @param {StoreUpdate} changes - data changes to process
     */
    @action
    updateData(changes) {
        const {update, add, remove, rawSummaryData, ...other} = changes;
        throwIf(!isEmpty(other), 'Unknown argument(s) passed to updateData().');

        // 1) Pre-process updates and adds into Records
        let updateRecs, addRecs;
        if (update) {
            updateRecs = update.map(it => this.createRecord(it));
        }
        if (add) {
            addRecs = new Map();
            add.forEach(it => {
                if (it.hasOwnProperty('rawData') && it.hasOwnProperty('parentId')) {
                    this.createRecords([it.rawData], it.parentId, addRecs);
                } else {
                    this.createRecords([it], null, addRecs);
                }
            });
        }

        // 2) Pre-process summary record, peeling it out of updates if needed
        let {summaryRecord} = this,
            summaryUpdateRec;
        if (summaryRecord) {
            [summaryUpdateRec] = lodashRemove(updateRecs, {id: summaryRecord.id});
            if (!summaryUpdateRec && rawSummaryData) {
                summaryUpdateRec = this.createRecord(rawSummaryData);
            }
        }

        // 3) Apply changes
        let didUpdate = false;
        if (!isEmpty(updateRecs) || (addRecs && addRecs.size) || !isEmpty(remove)) {
            this._all = this._all.updateData({update: updateRecs, add: addRecs, remove: remove});
            this.rebuildFiltered();
            didUpdate = true;
        }

        if (summaryUpdateRec) {
            this.setSummaryRecordInternal(summaryUpdateRec);
            didUpdate = true;
        }

        if (didUpdate) this.lastUpdated = Date.now();
    }

    /** Remove all records from the store. */
    clear() {
        this.loadData([], null);
    }

    /**
     * Call if/when any records have had their data modified directly, outside of this store's load
     * and update APIs. An example would be an inline grid editor updating a data field.
     *
     * To change the structure of the data (e.g. deletion, additions, re-parenting of children)
     * the `updateData()` or `loadData()` methods must be used instead.
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

    /** Get the count of the filtered records in the store. */
    get count() {
        return this._filtered.count;
    }

    /** Get the count of all records loaded into the store. */
    get allCount() {
        return this._all.count;
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
    get empty() {
        return this._filtered.empty;
    }

    /** Is this store empty before filters have been applied? */
    get allEmpty() {
        return this._all.empty;
    }

    /**
     * Get a record by ID, or null if no matching record found.
     *
     * @param {(string|number)} id
     * @param {boolean} [fromFiltered] - true to skip records excluded by any active filter.
     * @return {Record}
     */
    getById(id, fromFiltered = false) {
        const rs = fromFiltered ? this._filtered : this._all;
        return rs.getById(id);
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
            `Applications should not specify a field for the id of a record. An id property is created 
            automatically for all records. See Store.idSpec for more info.`
        );
        return ret;
    }

    setSummaryRecordInternal(record) {
        if (record) {
            record.xhIsSummary = true;
        }
        this.summaryRecord = record;
    }

    //---------------------------------------
    // Record Generation
    //---------------------------------------
    createRecord(raw, parentId) {
        const {processRawData} = this;

        let data = raw;
        if (processRawData) {
            data = processRawData(raw);
            throwIf(!data, 'processRawData should return an object. If writing/editing, be sure to return a clone!');
        }

        return new Record({data, raw, parentId, store: this});
    }

    createRecords(rawRecs, parentId, recordMap = new Map()) {
        rawRecs.forEach(raw => {
            const rec = this.createRecord(raw, parentId),
                {id} = rec;

            throwIf(
                recordMap.has(id),
                `ID ${id} is not unique. Use the 'Store.idSpec' config to resolve a unique ID for each record.`
            );

            recordMap.set(id, rec);

            if (raw.children) {
                this.createRecords(raw.children, id, recordMap);
            }
        });
        return recordMap;
    }
}

/**
 * @typedef {Object} StoreUpdate - object representing data changes to perform
 *      on a Store's data in a single transaction.
 * @property {Object[]} [update] - list of raw data objects representing records to be updated.
 *      Updates must be matched to existing records by id in order to be applied. The form of the
 *      update objects should be the same as presented to loadData(), with the exception that any
 *      children property will be ignored, and any existing children for the record being updated
 *      will be preserved. If the record is a child, the new updated instance will be assigned to
 *      the same parent. (Meaning: parent/child relationships *cannot* be modified via updates.)
 * @property {Object[]} [add] - list of raw data representing records to be added, Each top-level
 *      item in the array must be either a rawData object of the form passed to loadData or
 *      a wrapper object of the form `{parentId: x, rawData: {}}`, where `parentId` provides
 *      a pointer to the intended parent if the record is not to be added to the root. The rawData
 *      *can* include a children property that will be processed into new child records.
 *      (Meaning: adds can be used to add new branches to the tree.)
 * @property {string[]} [remove] - list of ids representing records to be removed. Any children of
 *      these records will also be removed.
 * @property {Object} [rawSummaryData] - update to the dedicated summary row for this store.
 *      If the store has its `loadRootAsSummary` flag set to true, the summary record should
 *      instead be provided via the `update` property.
 */
